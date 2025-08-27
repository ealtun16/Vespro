import { 
  users, 
  tankSpecifications,
  costAnalyses,
  materials,
  costAnalysisMaterials,
  type User, 
  type InsertUser,
  type TankSpecification,
  type InsertTankSpecification,
  type CostAnalysis,
  type InsertCostAnalysis,
  type Material,
  type InsertMaterial,
  type CostAnalysisMaterial,
  type InsertCostAnalysisMaterial
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

  // Cost Analysis methods
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
      whereClause = sql`${whereClause} AND ${costAnalyses.reportId} ILIKE ${'%' + search + '%'}`;
    }
    
    if (tankType && tankType !== 'all') {
      whereClause = sql`${whereClause} AND ${tankSpecifications.type} = ${tankType}`;
    }

    const analyses = await db
      .select({
        id: costAnalyses.id,
        reportId: costAnalyses.reportId,
        materialCost: costAnalyses.materialCost,
        laborCost: costAnalyses.laborCost,
        overheadCost: costAnalyses.overheadCost,
        totalCost: costAnalyses.totalCost,
        analysisDate: costAnalyses.analysisDate,
        tankType: tankSpecifications.type,
        tankName: tankSpecifications.name,
        capacity: tankSpecifications.capacity,
        height: tankSpecifications.height,
      })
      .from(costAnalyses)
      .leftJoin(tankSpecifications, eq(costAnalyses.tankSpecificationId, tankSpecifications.id))
      .where(whereClause)
      .orderBy(desc(costAnalyses.analysisDate))
      .limit(limit)
      .offset(offset);

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(costAnalyses)
      .leftJoin(tankSpecifications, eq(costAnalyses.tankSpecificationId, tankSpecifications.id))
      .where(whereClause);

    return { analyses: analyses as any[], total: count };
  }

  async getCostAnalysis(id: string): Promise<CostAnalysis | undefined> {
    const [analysis] = await db.select().from(costAnalyses).where(eq(costAnalyses.id, id));
    return analysis || undefined;
  }

  async getCostAnalysisWithDetails(id: string): Promise<any> {
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

  async getDashboardStats(): Promise<any> {
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
