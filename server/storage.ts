import { 
  users, 
  tankSpecifications,
  costAnalyses,
  materials,
  costAnalysisMaterials,
  // Vespro schema
  vespro_forms,
  vespro_cost_items,
  vespro_materials,
  v_cost_analysis_list,
  v_cost_analysis_materials,
  v_dashboard_stats,
  type User, 
  type InsertUser,
  type TankSpecification,
  type InsertTankSpecification,
  type CostAnalysis,
  type InsertCostAnalysis,
  type Material,
  type InsertMaterial,
  type CostAnalysisMaterial,
  type InsertCostAnalysisMaterial,
  // Vespro types
  type VesproForm,
  type InsertVesproForm,
  type VesproCostItem,
  type InsertVesproCostItem
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, like, and, or, sql } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Tank Specification methods
  getAllTankSpecifications(): Promise<TankSpecification[]>;
  getTankSpecification(id: string): Promise<TankSpecification | undefined>;
  createTankSpecification(spec: InsertTankSpecification): Promise<TankSpecification>;
  updateTankSpecification(id: string, spec: Partial<InsertTankSpecification>): Promise<TankSpecification | undefined>;
  deleteTankSpecification(id: string): Promise<boolean>;

  // Cost Analysis methods (now using vespro compatibility views)
  getAllCostAnalyses(page?: number, limit?: number, search?: string, tankType?: string): Promise<{ analyses: CostAnalysis[], total: number }>;
  getCostAnalysis(id: string): Promise<CostAnalysis | undefined>;
  getCostAnalysisWithDetails(id: string): Promise<any>;
  createCostAnalysis(analysis: InsertCostAnalysis): Promise<CostAnalysis>;
  updateCostAnalysis(id: string, analysis: Partial<InsertCostAnalysis>): Promise<CostAnalysis | undefined>;
  deleteCostAnalysis(id: string): Promise<boolean>;

  // Material methods
  getAllMaterials(): Promise<Material[]>;
  getMaterial(id: string): Promise<Material | undefined>;
  createMaterial(material: InsertMaterial): Promise<Material>;

  // Cost Analysis Material methods
  createCostAnalysisMaterial(cam: InsertCostAnalysisMaterial): Promise<CostAnalysisMaterial>;
  getCostAnalysisMaterials(costAnalysisId: string): Promise<any[]>;

  // Vespro methods for Excel import
  createVesproForm(form: InsertVesproForm): Promise<VesproForm>;
  createVesproCostItems(items: InsertVesproCostItem[]): Promise<VesproCostItem[]>;
  getAllVesproForms(): Promise<VesproForm[]>;
  getVesproForm(id: string): Promise<VesproForm | undefined>;
  getVesproFormCostItems(formId: string): Promise<VesproCostItem[]>;

  // Dashboard stats
  getDashboardStats(): Promise<any>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getAllTankSpecifications(): Promise<TankSpecification[]> {
    return await db.select().from(tankSpecifications).orderBy(desc(tankSpecifications.createdAt));
  }

  async getTankSpecification(id: string): Promise<TankSpecification | undefined> {
    const [spec] = await db.select().from(tankSpecifications).where(eq(tankSpecifications.id, id));
    return spec || undefined;
  }

  async createTankSpecification(spec: InsertTankSpecification): Promise<TankSpecification> {
    const [newSpec] = await db.insert(tankSpecifications).values(spec).returning();
    return newSpec;
  }

  async updateTankSpecification(id: string, spec: Partial<InsertTankSpecification>): Promise<TankSpecification | undefined> {
    const [updated] = await db
      .update(tankSpecifications)
      .set({ ...spec, updatedAt: new Date() })
      .where(eq(tankSpecifications.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteTankSpecification(id: string): Promise<boolean> {
    const result = await db.delete(tankSpecifications).where(eq(tankSpecifications.id, id));
    return (result.rowCount || 0) > 0;
  }

  async getAllCostAnalyses(page = 1, limit = 10, search = '', tankType = ''): Promise<{ analyses: CostAnalysis[], total: number }> {
    const offset = (page - 1) * limit;
    
    let whereClause = sql`1 = 1`;
    
    if (search) {
      whereClause = sql`${whereClause} AND ${v_cost_analysis_list.reportId} ILIKE ${'%' + search + '%'}`;
    }
    
    if (tankType && tankType !== 'all') {
      whereClause = sql`${whereClause} AND ${v_cost_analysis_list.tankType} = ${tankType}`;
    }

    const analyses = await db
      .select()
      .from(v_cost_analysis_list)
      .where(whereClause)
      .orderBy(desc(v_cost_analysis_list.analysisDate))
      .limit(limit)
      .offset(offset);

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(v_cost_analysis_list)
      .where(whereClause);

    return { analyses: analyses as any[], total: count };
  }

  async getCostAnalysis(id: string): Promise<CostAnalysis | undefined> {
    const [analysis] = await db.select().from(costAnalyses).where(eq(costAnalyses.id, id));
    return analysis || undefined;
  }

  async getCostAnalysisWithDetails(id: string): Promise<any> {
    // Try to get from vespro views first, fallback to legacy if not found
    try {
      const [analysis] = await db
        .select()
        .from(v_cost_analysis_list)
        .where(eq(v_cost_analysis_list.id, id));

      if (analysis) {
        // Get materials from vespro view
        const materials = await db
          .select()
          .from(v_cost_analysis_materials)
          .where(eq(v_cost_analysis_materials.costAnalysisId, id));

        return {
          ...analysis,
          materials,
        };
      }
    } catch (error) {
      console.log("Vespro cost analysis details not available, using legacy method");
    }

    // Fallback to legacy method
    const [analysis] = await db
      .select()
      .from(costAnalyses)
      .leftJoin(tankSpecifications, eq(costAnalyses.tankSpecificationId, tankSpecifications.id))
      .where(eq(costAnalyses.id, id));

    if (!analysis) return undefined;

    const materials = await this.getCostAnalysisMaterials(id);

    return {
      ...analysis.cost_analyses,
      tankSpecification: analysis.tank_specifications,
      materials,
    };
  }

  async createCostAnalysis(analysis: InsertCostAnalysis): Promise<CostAnalysis> {
    const [newAnalysis] = await db.insert(costAnalyses).values(analysis).returning();
    return newAnalysis;
  }

  async updateCostAnalysis(id: string, analysis: Partial<InsertCostAnalysis>): Promise<CostAnalysis | undefined> {
    const [updated] = await db
      .update(costAnalyses)
      .set({ ...analysis, updatedAt: new Date() })
      .where(eq(costAnalyses.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteCostAnalysis(id: string): Promise<boolean> {
    const result = await db.delete(costAnalyses).where(eq(costAnalyses.id, id));
    return (result.rowCount || 0) > 0;
  }

  async getAllMaterials(): Promise<Material[]> {
    return await db.select().from(materials).orderBy(materials.category, materials.name);
  }

  async getMaterial(id: string): Promise<Material | undefined> {
    const [material] = await db.select().from(materials).where(eq(materials.id, id));
    return material || undefined;
  }

  async createMaterial(material: InsertMaterial): Promise<Material> {
    const [newMaterial] = await db.insert(materials).values(material).returning();
    return newMaterial;
  }

  async createCostAnalysisMaterial(cam: InsertCostAnalysisMaterial): Promise<CostAnalysisMaterial> {
    const [newCAM] = await db.insert(costAnalysisMaterials).values(cam).returning();
    return newCAM;
  }

  async getCostAnalysisMaterials(costAnalysisId: string): Promise<any[]> {
    return await db
      .select({
        id: costAnalysisMaterials.id,
        quantity: costAnalysisMaterials.quantity,
        totalCost: costAnalysisMaterials.totalCost,
        material: {
          id: materials.id,
          name: materials.name,
          category: materials.category,
          unit: materials.unit,
          unitCost: materials.unitCost,
          supplier: materials.supplier,
        },
      })
      .from(costAnalysisMaterials)
      .leftJoin(materials, eq(costAnalysisMaterials.materialId, materials.id))
      .where(eq(costAnalysisMaterials.costAnalysisId, costAnalysisId));
  }

  // Vespro methods for Excel import
  async createVesproForm(form: InsertVesproForm): Promise<VesproForm> {
    const [newForm] = await db.insert(vespro_forms).values(form).returning();
    return newForm;
  }

  async createVesproCostItems(items: InsertVesproCostItem[]): Promise<VesproCostItem[]> {
    if (items.length === 0) return [];
    const newItems = await db.insert(vespro_cost_items).values(items).returning();
    return newItems;
  }

  async getAllVesproForms(): Promise<VesproForm[]> {
    return await db.select().from(vespro_forms).orderBy(desc(vespro_forms.created_at));
  }

  async getVesproForm(id: string): Promise<VesproForm | undefined> {
    const [form] = await db.select().from(vespro_forms).where(eq(vespro_forms.form_id, id));
    return form || undefined;
  }

  async getVesproFormCostItems(formId: string): Promise<VesproCostItem[]> {
    return await db.select().from(vespro_cost_items).where(eq(vespro_cost_items.form_id, formId));
  }

  async getDashboardStats(): Promise<any> {
    // Try to use vespro dashboard stats view, fallback to original if empty
    try {
      const [vesproStats] = await db.select().from(v_dashboard_stats).limit(1);
      if (vesproStats && (vesproStats.totalReports || 0) > 0) {
        return vesproStats;
      }
    } catch (error) {
      console.log("Vespro dashboard stats not available, using original method");
    }

    // Fallback to original dashboard stats
    const [totalReports] = await db.select({ count: sql<number>`count(*)` }).from(costAnalyses);
    const [totalTankModels] = await db.select({ count: sql<number>`count(*)` }).from(tankSpecifications);
    
    const [avgCost] = await db
      .select({ avg: sql<number>`avg(${costAnalyses.totalCost})` })
      .from(costAnalyses);
    
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [monthlyReports] = await db
      .select({ count: sql<number>`count(*)` })
      .from(costAnalyses)
      .where(sql`${costAnalyses.analysisDate} >= ${thirtyDaysAgo}`);

    return {
      totalReports: totalReports.count,
      tankModels: totalTankModels.count,
      averageCost: Math.round(avgCost.avg || 0),
      monthlyReports: monthlyReports.count,
    };
  }
}

export const storage = new DatabaseStorage();
