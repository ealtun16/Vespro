import { 
  users, 
  tankSpecifications,
  costAnalyses,
  materials,
  costAnalysisMaterials,
  settings,
  chatSessions,
  chatMessages,
  // Vespro schema
  vespro_forms,
  vespro_cost_items,
  vespro_materials,
  v_cost_analysis_list,
  v_cost_analysis_materials,
  v_dashboard_stats,
  // New Turkish schema
  turkishCostAnalyses,
  turkishCostItems,
  // New Tank Order schema
  sheetUpload,
  tankOrder,
  costItem,
  type SheetUpload,
  type InsertSheetUpload,
  type TankOrder,
  type InsertTankOrder,
  type CostItem,
  type InsertCostItem,
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
  type Settings,
  type InsertSettings,
  type ChatSession,
  type InsertChatSession,
  type ChatMessage,
  type InsertChatMessage,
  // Vespro types
  type VesproForm,
  type InsertVesproForm,
  type VesproCostItem,
  type InsertVesproCostItem,
  // New Turkish types
  type TurkishCostAnalysis,
  type InsertTurkishCostAnalysis,
  type TurkishCostItem,
  type InsertTurkishCostItem
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, like, and, or, sql } from "drizzle-orm";

// Type for VesproForm without file_data (to prevent memory issues)
type VesproFormWithoutFileData = Omit<VesproForm, 'file_data'>;

// Type for Settings without sensitive data (to prevent exposure to frontend)
export type SafeSettings = Omit<Settings, 'n8nApiKey'>;

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
  getAllVesproForms(): Promise<VesproFormWithoutFileData[]>; // Excludes file_data to prevent memory issues
  getVesproForm(id: string): Promise<VesproFormWithoutFileData | undefined>; // Excludes file_data to prevent memory issues
  getVesproFormCostItems(formId: string): Promise<VesproCostItem[]>;
  getVesproFormFileData(id: string): Promise<{ file_data: string | null; original_filename: string | null } | undefined>;
  getVesproFormComplete(id: string): Promise<VesproForm | undefined>;

  // Dashboard stats
  getDashboardStats(): Promise<any>;

  // Settings methods (safe versions without API key for frontend)
  getSettings(userId?: string): Promise<SafeSettings | undefined>;
  createSettings(settings: InsertSettings): Promise<SafeSettings>;
  updateSettings(id: string, settings: Partial<InsertSettings>): Promise<SafeSettings | undefined>;
  // Internal method with API key (server-only)
  getSettingsWithApiKey(userId?: string): Promise<Settings | undefined>;
  getGlobalSettings(): Promise<SafeSettings | undefined>;
  getUserSettings(userId: string): Promise<SafeSettings | undefined>;

  // Chat Session methods
  createChatSession(session: InsertChatSession): Promise<ChatSession>;
  getChatSession(id: string): Promise<ChatSession | undefined>;
  getChatSessionsByUser(userId: string): Promise<ChatSession[]>;
  updateChatSession(id: string, session: Partial<InsertChatSession>): Promise<ChatSession | undefined>;
  deleteChatSession(id: string): Promise<boolean>;

  // Chat Message methods
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  getChatMessages(sessionId: string): Promise<ChatMessage[]>;
  getChatMessage(id: string): Promise<ChatMessage | undefined>;

  // Tank Order methods  
  createSheetUpload(upload: InsertSheetUpload): Promise<SheetUpload>;
  getSheetUpload(id: string): Promise<SheetUpload | undefined>;
  updateSheetUpload(id: string, upload: Partial<InsertSheetUpload>): Promise<SheetUpload | undefined>;
  createTankOrder(order: InsertTankOrder): Promise<TankOrder>;
  createTankOrders(orders: InsertTankOrder[]): Promise<TankOrder[]>;
  getAllTankOrders(): Promise<TankOrder[]>;
  getTankOrder(id: string): Promise<TankOrder | undefined>;
  getTankOrderWithItems(id: string): Promise<{ order: TankOrder; items: CostItem[] } | null>;
  deleteTankOrder(id: string): Promise<boolean>;
  updateTankOrder(id: string, order: Partial<InsertTankOrder>): Promise<TankOrder | undefined>;
  createCostItem(item: InsertCostItem): Promise<CostItem>;
  updateCostItem(id: string, item: Partial<InsertCostItem>): Promise<CostItem | undefined>;

  // NEW TURKISH COST ANALYSIS METHODS
  // Turkish Cost Analysis methods
  getAllTurkishCostAnalyses(page?: number, limit?: number, search?: string): Promise<{ analyses: TurkishCostAnalysis[], total: number }>;
  getTurkishCostAnalysis(id: string): Promise<TurkishCostAnalysis | undefined>;
  getTurkishCostAnalysisWithItems(id: string): Promise<{ analysis: TurkishCostAnalysis, items: TurkishCostItem[] } | undefined>;
  createTurkishCostAnalysis(analysis: InsertTurkishCostAnalysis): Promise<TurkishCostAnalysis>;
  updateTurkishCostAnalysis(id: string, analysis: Partial<InsertTurkishCostAnalysis>): Promise<TurkishCostAnalysis | undefined>;
  deleteTurkishCostAnalysis(id: string): Promise<boolean>;

  // Turkish Cost Items methods
  getTurkishCostItems(analysisId: string): Promise<TurkishCostItem[]>;
  createTurkishCostItems(items: InsertTurkishCostItem[]): Promise<TurkishCostItem[]>;
  updateTurkishCostItem(id: string, item: Partial<InsertTurkishCostItem>): Promise<TurkishCostItem | undefined>;
  deleteTurkishCostItem(id: string): Promise<boolean>;
  deleteTurkishCostItemsByAnalysisId(analysisId: string): Promise<boolean>;
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
      .select({
        id: v_cost_analysis_list.id,
        reportId: v_cost_analysis_list.reportId,
        materialCost: v_cost_analysis_list.materialCost,
        laborCost: v_cost_analysis_list.laborCost,
        overheadCost: v_cost_analysis_list.overheadCost,
        totalCost: v_cost_analysis_list.totalCost,
        currency: v_cost_analysis_list.currency,
        analysisDate: v_cost_analysis_list.analysisDate,
        tankName: v_cost_analysis_list.tankName,
        tankType: v_cost_analysis_list.tankType,
        capacity: v_cost_analysis_list.capacity,
        height: v_cost_analysis_list.height,
        tankSpecificationId: v_cost_analysis_list.tankSpecificationId,
        createdAt: v_cost_analysis_list.createdAt,
        updatedAt: v_cost_analysis_list.updatedAt
      })
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
        .select({
          id: v_cost_analysis_list.id,
          reportId: v_cost_analysis_list.reportId,
          materialCost: v_cost_analysis_list.materialCost,
          laborCost: v_cost_analysis_list.laborCost,
          overheadCost: v_cost_analysis_list.overheadCost,
          totalCost: v_cost_analysis_list.totalCost,
          currency: v_cost_analysis_list.currency,
          analysisDate: v_cost_analysis_list.analysisDate,
          tankName: v_cost_analysis_list.tankName,
          tankType: v_cost_analysis_list.tankType,
          capacity: v_cost_analysis_list.capacity,
          height: v_cost_analysis_list.height,
          tankSpecificationId: v_cost_analysis_list.tankSpecificationId,
          createdAt: v_cost_analysis_list.createdAt,
          updatedAt: v_cost_analysis_list.updatedAt
        })
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
    // Filter and convert category types to valid values
    const validItems = items.map(item => ({
      ...item,
      cat1_type: (item.cat1_type === 'ATOLYE_ISCILIK' || item.cat1_type === 'DIS_TEDARIK') ? item.cat1_type as "ATOLYE_ISCILIK" | "DIS_TEDARIK" : null,
      cat2_type: (item.cat2_type === 'ATOLYE_ISCILIK' || item.cat2_type === 'DIS_TEDARIK') ? item.cat2_type as "ATOLYE_ISCILIK" | "DIS_TEDARIK" : null,
    }));
    const newItems = await db.insert(vespro_cost_items).values(validItems).returning();
    return newItems;
  }

  async getAllVesproForms(): Promise<VesproFormWithoutFileData[]> {
    // Exclude large file_data field to prevent memory issues
    return await db.select({
      form_id: vespro_forms.form_id,
      form_code: vespro_forms.form_code,
      client_name: vespro_forms.client_name,
      form_title: vespro_forms.form_title,
      form_date: vespro_forms.form_date,
      revision_no: vespro_forms.revision_no,
      currency: vespro_forms.currency,
      tank_name: vespro_forms.tank_name,
      tank_type: vespro_forms.tank_type,
      tank_width_mm: vespro_forms.tank_width_mm,
      tank_height_mm: vespro_forms.tank_height_mm,
      tank_diameter_mm: vespro_forms.tank_diameter_mm,
      tank_volume: vespro_forms.tank_volume,
      tank_surface_area: vespro_forms.tank_surface_area,
      tank_material_type: vespro_forms.tank_material_type,
      tank_material_grade: vespro_forms.tank_material_grade,
      operating_pressure: vespro_forms.operating_pressure,
      operating_temperature: vespro_forms.operating_temperature,
      drawing_revision: vespro_forms.drawing_revision,
      project_status: vespro_forms.project_status,
      calculated_values: vespro_forms.calculated_values,
      notes: vespro_forms.notes,
      metadata: vespro_forms.metadata,
      original_filename: vespro_forms.original_filename,
      // file_data: excluded to prevent memory issues
      created_at: vespro_forms.created_at,
    }).from(vespro_forms).orderBy(desc(vespro_forms.created_at));
  }

  async getVesproForm(id: string): Promise<VesproFormWithoutFileData | undefined> {
    // Exclude large file_data field to prevent memory issues
    const [form] = await db.select({
      form_id: vespro_forms.form_id,
      form_code: vespro_forms.form_code,
      client_name: vespro_forms.client_name,
      form_title: vespro_forms.form_title,
      form_date: vespro_forms.form_date,
      revision_no: vespro_forms.revision_no,
      currency: vespro_forms.currency,
      tank_name: vespro_forms.tank_name,
      tank_type: vespro_forms.tank_type,
      tank_width_mm: vespro_forms.tank_width_mm,
      tank_height_mm: vespro_forms.tank_height_mm,
      tank_diameter_mm: vespro_forms.tank_diameter_mm,
      tank_volume: vespro_forms.tank_volume,
      tank_surface_area: vespro_forms.tank_surface_area,
      tank_material_type: vespro_forms.tank_material_type,
      tank_material_grade: vespro_forms.tank_material_grade,
      operating_pressure: vespro_forms.operating_pressure,
      operating_temperature: vespro_forms.operating_temperature,
      drawing_revision: vespro_forms.drawing_revision,
      project_status: vespro_forms.project_status,
      calculated_values: vespro_forms.calculated_values,
      notes: vespro_forms.notes,
      metadata: vespro_forms.metadata,
      original_filename: vespro_forms.original_filename,
      // file_data: excluded to prevent memory issues
      created_at: vespro_forms.created_at,
    }).from(vespro_forms).where(eq(vespro_forms.form_id, id));
    return form || undefined;
  }

  async getVesproFormCostItems(formId: string): Promise<VesproCostItem[]> {
    return await db.select().from(vespro_cost_items).where(eq(vespro_cost_items.form_id, formId));
  }

  // Method to get file data only when needed
  async getVesproFormFileData(id: string): Promise<{ file_data: string | null; original_filename: string | null } | undefined> {
    const [form] = await db.select({
      file_data: vespro_forms.file_data,
      original_filename: vespro_forms.original_filename,
    }).from(vespro_forms).where(eq(vespro_forms.form_id, id));
    return form || undefined;
  }

  // Method to get complete form with file data when specifically needed
  async getVesproFormComplete(id: string): Promise<VesproForm | undefined> {
    const [form] = await db.select().from(vespro_forms).where(eq(vespro_forms.form_id, id));
    return form || undefined;
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

  // AI Analysis methods
  async createAutoCostAnalysis(analysis: InsertCostAnalysis): Promise<CostAnalysis> {
    const [newAnalysis] = await db.insert(costAnalyses).values(analysis).returning();
    return newAnalysis;
  }

  // Settings methods implementation (safe versions without API key)
  private omitApiKey(settings: Settings | undefined): SafeSettings | undefined {
    if (!settings) return undefined;
    const { n8nApiKey, ...safe } = settings;
    return safe;
  }

  async getGlobalSettings(): Promise<SafeSettings | undefined> {
    const result = await db
      .select()
      .from(settings)
      .where(eq(settings.settingsType, "global"))
      .limit(1);
    
    return this.omitApiKey(result[0]);
  }

  async getSettings(userId?: string): Promise<SafeSettings | undefined> {
    if (userId) {
      return await this.getUserSettings(userId);
    }
    return await this.getGlobalSettings();
  }

  async getUserSettings(userId: string): Promise<SafeSettings | undefined> {
    const [userSettings] = await db.select().from(settings)
      .where(and(
        eq(settings.userId, userId),
        eq(settings.settingsType, "user")
      ))
      .limit(1);
    
    // Fallback to global settings if user settings don't exist
    if (!userSettings) {
      return await this.getGlobalSettings();
    }
    
    return this.omitApiKey(userSettings);
  }

  async createSettings(settingsData: InsertSettings): Promise<SafeSettings> {
    const [newSettings] = await db.insert(settings).values(settingsData).returning();
    return this.omitApiKey(newSettings)!;
  }

  async updateSettings(id: string, settingsData: Partial<InsertSettings>): Promise<SafeSettings | undefined> {
    const [updatedSettings] = await db.update(settings)
      .set({ ...settingsData, updatedAt: new Date() })
      .where(eq(settings.id, id))
      .returning();
    return this.omitApiKey(updatedSettings);
  }

  // WARNING: SERVER-ONLY - DO NOT EXPOSE VIA API
  // Internal method with API key for server-side agent initialization only
  async getSettingsWithApiKey(userId?: string): Promise<Settings | undefined> {
    if (userId) {
      const [userSettings] = await db.select().from(settings)
        .where(and(
          eq(settings.userId, userId),
          eq(settings.settingsType, "user")
        ))
        .limit(1);
      
      if (userSettings) return userSettings;
    }
    
    const result = await db
      .select()
      .from(settings)
      .where(eq(settings.settingsType, "global"))
      .limit(1);
    
    return result[0];
  }

  // Chat Session methods
  async createChatSession(session: InsertChatSession): Promise<ChatSession> {
    const [newSession] = await db.insert(chatSessions).values(session).returning();
    return newSession;
  }

  async getChatSession(id: string): Promise<ChatSession | undefined> {
    const [session] = await db.select().from(chatSessions).where(eq(chatSessions.id, id));
    return session || undefined;
  }

  async getChatSessionsByUser(userId: string): Promise<ChatSession[]> {
    return await db.select()
      .from(chatSessions)
      .where(eq(chatSessions.userId, userId))
      .orderBy(desc(chatSessions.updatedAt));
  }

  async updateChatSession(id: string, session: Partial<InsertChatSession>): Promise<ChatSession | undefined> {
    const [updated] = await db.update(chatSessions)
      .set({ ...session, updatedAt: new Date() })
      .where(eq(chatSessions.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteChatSession(id: string): Promise<boolean> {
    const result = await db.delete(chatSessions).where(eq(chatSessions.id, id)).returning();
    return result.length > 0;
  }

  // Chat Message methods
  async createChatMessage(message: InsertChatMessage): Promise<ChatMessage> {
    const [newMessage] = await db.insert(chatMessages).values(message).returning();
    return newMessage;
  }

  async getChatMessages(sessionId: string): Promise<ChatMessage[]> {
    return await db.select()
      .from(chatMessages)
      .where(eq(chatMessages.sessionId, sessionId))
      .orderBy(chatMessages.createdAt); // ASC for chronological order
  }

  async getChatMessage(id: string): Promise<ChatMessage | undefined> {
    const [message] = await db.select().from(chatMessages).where(eq(chatMessages.id, id));
    return message || undefined;
  }

  // NEW TURKISH COST ANALYSIS IMPLEMENTATION
  async getAllTurkishCostAnalyses(page = 1, limit = 10, search = ''): Promise<{ analyses: TurkishCostAnalysis[], total: number }> {
    const offset = (page - 1) * limit;
    
    let whereConditions = [];
    
    if (search) {
      whereConditions.push(
        or(
          like(turkishCostAnalyses.form_code, `%${search}%`),
          like(turkishCostAnalyses.client_name, `%${search}%`),
          like(turkishCostAnalyses.form_title, `%${search}%`),
          like(turkishCostAnalyses.tank_name, `%${search}%`)
        )
      );
    }

    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

    const analysesQuery = db
      .select()
      .from(turkishCostAnalyses)
      .orderBy(desc(turkishCostAnalyses.created_at))
      .limit(limit)
      .offset(offset);

    const countQuery = db
      .select({ count: sql<number>`count(*)` })
      .from(turkishCostAnalyses);

    // Only add where clause if we have conditions
    const analyses = whereClause 
      ? await analysesQuery.where(whereClause)
      : await analysesQuery;

    const [{ count }] = whereClause
      ? await countQuery.where(whereClause)
      : await countQuery;

    return { analyses, total: count };
  }

  async getTurkishCostAnalysis(id: string): Promise<TurkishCostAnalysis | undefined> {
    const [analysis] = await db.select().from(turkishCostAnalyses).where(eq(turkishCostAnalyses.id, id));
    return analysis || undefined;
  }

  async getTurkishCostAnalysisWithItems(id: string): Promise<{ analysis: TurkishCostAnalysis, items: TurkishCostItem[] } | undefined> {
    const analysis = await this.getTurkishCostAnalysis(id);
    if (!analysis) return undefined;

    const items = await this.getTurkishCostItems(id);

    return { analysis, items };
  }

  async createTurkishCostAnalysis(analysis: InsertTurkishCostAnalysis): Promise<TurkishCostAnalysis> {
    const [newAnalysis] = await db.insert(turkishCostAnalyses).values(analysis).returning();
    return newAnalysis;
  }

  async updateTurkishCostAnalysis(id: string, analysis: Partial<InsertTurkishCostAnalysis>): Promise<TurkishCostAnalysis | undefined> {
    const [updated] = await db
      .update(turkishCostAnalyses)
      .set({ ...analysis, updated_at: new Date() })
      .where(eq(turkishCostAnalyses.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteTurkishCostAnalysis(id: string): Promise<boolean> {
    const result = await db.delete(turkishCostAnalyses).where(eq(turkishCostAnalyses.id, id));
    return (result.rowCount || 0) > 0;
  }

  async getTurkishCostItems(analysisId: string): Promise<TurkishCostItem[]> {
    return await db
      .select()
      .from(turkishCostItems)
      .where(eq(turkishCostItems.analysis_id, analysisId))
      .orderBy(turkishCostItems.created_at);
  }

  async createTurkishCostItems(items: InsertTurkishCostItem[]): Promise<TurkishCostItem[]> {
    if (items.length === 0) return [];
    const newItems = await db.insert(turkishCostItems).values(items).returning();
    return newItems;
  }

  async updateTurkishCostItem(id: string, item: Partial<InsertTurkishCostItem>): Promise<TurkishCostItem | undefined> {
    const [updated] = await db
      .update(turkishCostItems)
      .set(item)
      .where(eq(turkishCostItems.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteTurkishCostItem(id: string): Promise<boolean> {
    const result = await db.delete(turkishCostItems).where(eq(turkishCostItems.id, id));
    return (result.rowCount || 0) > 0;
  }

  async deleteTurkishCostItemsByAnalysisId(analysisId: string): Promise<boolean> {
    const result = await db.delete(turkishCostItems).where(eq(turkishCostItems.analysis_id, analysisId));
    return (result.rowCount || 0) >= 0; // Returns true even if 0 items deleted
  }

  // Tank Order methods
  async createSheetUpload(upload: InsertSheetUpload): Promise<SheetUpload> {
    const [newUpload] = await db.insert(sheetUpload).values(upload).returning();
    return newUpload;
  }

  async getSheetUpload(id: string): Promise<SheetUpload | undefined> {
    const [upload] = await db
      .select()
      .from(sheetUpload)
      .where(eq(sheetUpload.id, BigInt(id)));
    return upload || undefined;
  }

  async updateSheetUpload(id: string, upload: Partial<InsertSheetUpload>): Promise<SheetUpload | undefined> {
    const [updated] = await db
      .update(sheetUpload)
      .set(upload)
      .where(eq(sheetUpload.id, BigInt(id)))
      .returning();
    return updated || undefined;
  }

  async createTankOrder(order: InsertTankOrder): Promise<TankOrder> {
    const [newOrder] = await db.insert(tankOrder).values(order).returning();
    return newOrder;
  }

  async createTankOrders(orders: InsertTankOrder[]): Promise<TankOrder[]> {
    if (orders.length === 0) return [];
    const newOrders = await db.insert(tankOrder).values(orders).returning();
    return newOrders;
  }

  async getTankOrder(id: string): Promise<TankOrder | undefined> {
    const [order] = await db.select().from(tankOrder).where(eq(tankOrder.id, BigInt(id)));
    return order || undefined;
  }

  async deleteTankOrder(id: string): Promise<boolean> {
    const result = await db.delete(tankOrder).where(eq(tankOrder.id, BigInt(id)));
    return (result.rowCount || 0) > 0;
  }

  async updateTankOrder(id: string, order: Partial<InsertTankOrder>): Promise<TankOrder | undefined> {
    const [updated] = await db
      .update(tankOrder)
      .set(order)
      .where(eq(tankOrder.id, BigInt(id)))
      .returning();
    return updated || undefined;
  }

  async createCostItem(item: InsertCostItem): Promise<CostItem> {
    const [newItem] = await db.insert(costItem).values(item).returning();
    return newItem;
  }

  async updateCostItem(id: string, item: Partial<InsertCostItem>): Promise<CostItem | undefined> {
    const [updated] = await db
      .update(costItem)
      .set(item)
      .where(eq(costItem.id, BigInt(id)))
      .returning();
    return updated || undefined;
  }

  async getAllTankOrders(): Promise<TankOrder[]> {
    const orders = await db.select().from(tankOrder).orderBy(tankOrder.id);
    return orders;
  }

  async getTankOrderWithItems(id: string): Promise<{ order: TankOrder; items: CostItem[] } | null> {
    const [order] = await db.select().from(tankOrder).where(eq(tankOrder.id, BigInt(id)));
    
    if (!order) {
      return null;
    }
    
    const items = await db.select().from(costItem).where(eq(costItem.order_id, order.id));
    
    return { order, items };
  }

  // Dictionary table upsert methods
  async upsertUomUnit(code: string, label?: string): Promise<number> {
    const result = await db.execute(sql`
      INSERT INTO uom_unit (code, label)
      VALUES (${code}, ${label || code})
      ON CONFLICT (code) DO UPDATE SET label = EXCLUDED.label
      RETURNING id
    `);
    return (result.rows[0] as any).id;
  }

  async upsertMaterialQuality(name: string, note?: string): Promise<number> {
    const result = await db.execute(sql`
      INSERT INTO material_quality (name, note)
      VALUES (${name}, ${note || null})
      ON CONFLICT (name) DO UPDATE SET note = COALESCE(EXCLUDED.note, material_quality.note)
      RETURNING id
    `);
    return (result.rows[0] as any).id;
  }

  async upsertMaterialType(name: string, note?: string): Promise<number> {
    const result = await db.execute(sql`
      INSERT INTO material_type (name, note)
      VALUES (${name}, ${note || null})
      ON CONFLICT (name) DO UPDATE SET note = COALESCE(EXCLUDED.note, material_type.note)
      RETURNING id
    `);
    return (result.rows[0] as any).id;
  }

  async getOrdersList(): Promise<any[]> {
    const result = await db.execute(sql`
      SELECT * FROM orders_list_view 
      ORDER BY total_price_eur DESC NULLS LAST, updated_at DESC
    `);
    return result.rows as any[];
  }
}

export const storage = new DatabaseStorage();
