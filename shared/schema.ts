import { sql, relations } from "drizzle-orm";
import { pgTable, pgSchema, pgEnum, pgView, text, varchar, decimal, integer, timestamp, jsonb, uuid, bigserial, bigint, boolean, numeric, date, customType, smallserial, smallint } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Vespro schema
export const vespro = pgSchema("vespro");

// Reference existing vespro enums with customType (don't recreate them)
const categoryType = customType<{ data: "ATOLYE_ISCILIK" | "DIS_TEDARIK"; driverData: string }>({ 
  dataType: () => "vespro.category_type" 
});
const uom = customType<{ data: string; driverData: string }>({ 
  dataType: () => "vespro.uom" 
});

// Vespro tables
export const vespro_forms = vespro.table("forms", {
  form_id: uuid("form_id").primaryKey().default(sql`gen_random_uuid()`),
  form_code: text("form_code"),
  client_name: text("client_name"),
  form_title: text("form_title"),
  form_date: date("form_date"),
  revision_no: integer("revision_no").default(0),
  currency: text("currency").default("EUR"),
  // Tank specifications from Excel header
  tank_name: text("tank_name"),
  tank_type: text("tank_type"),
  tank_width_mm: numeric("tank_width_mm"),
  tank_height_mm: numeric("tank_height_mm"),
  tank_diameter_mm: numeric("tank_diameter_mm"),
  tank_volume: numeric("tank_volume"),
  tank_surface_area: numeric("tank_surface_area"),
  tank_material_type: text("tank_material_type"), // e.g., "EVATHERM"
  tank_material_grade: text("tank_material_grade"), // e.g., "super duplex-1.4410"
  operating_pressure: text("operating_pressure"), // e.g., "0 BAR"
  operating_temperature: text("operating_temperature"), // e.g., "SICAKLIK"
  // Additional Excel fields
  drawing_revision: text("drawing_revision"),
  project_status: text("project_status"),
  calculated_values: jsonb("calculated_values").default(sql`'{}'::jsonb`),
  notes: text("notes"),
  metadata: jsonb("metadata").default(sql`'{}'::jsonb`),
  // File storage for original Excel files
  original_filename: text("original_filename"), // Store original Excel filename
  file_data: text("file_data"), // Store base64 encoded Excel file data
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const vespro_materials = vespro.table("materials", {
  material_id: bigserial("material_id", { mode: "bigint" }).primaryKey(),
  quality: text("quality"),
  type: text("type"),
});

export const vespro_cost_groups = vespro.table("cost_groups", {
  group_id: bigserial("group_id", { mode: "bigint" }).primaryKey(),
  form_id: uuid("form_id").notNull().references(() => vespro_forms.form_id, { onDelete: "cascade" }),
  group_no: integer("group_no").notNull(),
  group_name: text("group_name"),
});

export const vespro_cost_items = vespro.table("cost_items", {
  item_id: bigserial("item_id", { mode: "bigint" }).primaryKey(),
  form_id: uuid("form_id").notNull().references(() => vespro_forms.form_id, { onDelete: "cascade" }),
  group_no: integer("group_no"),
  seq_no: integer("seq_no"),
  cost_factor: text("cost_factor"),
  material_id: bigserial("material_id", { mode: "bigint" }).references(() => vespro_materials.material_id),
  material_quality: text("material_quality"),
  material_type: text("material_type"),
  dim_a_mm: numeric("dim_a_mm"),
  dim_b_mm: numeric("dim_b_mm"),
  dim_c_thickness_mm: numeric("dim_c_thickness_mm"),
  mass_per_unit_kg: numeric("mass_per_unit_kg"),
  mass_per_unit_note: text("mass_per_unit_note"),
  quantity: numeric("quantity"),
  total_qty: numeric("total_qty"),
  qty_uom: uom("qty_uom"),
  unit_price_eur: numeric("unit_price_eur"),
  total_price_eur: numeric("total_price_eur"),
  material_status: text("material_status"),
  cat1_flag: boolean("cat1_flag"),
  cat1_type: categoryType("cat1_type"),
  cat1_amount_eur: numeric("cat1_amount_eur"),
  cat2_flag: boolean("cat2_flag"),
  cat2_type: categoryType("cat2_type"),
  cat2_amount_eur: numeric("cat2_amount_eur"),
  extra: jsonb("extra").default(sql`'{}'::jsonb`),
});

// Compatibility views (referencing existing views in vespro schema)
export const v_cost_analysis_list = vespro.view("v_cost_analysis_list", {
  id: text("id"),
  reportId: text("reportid"),
  materialCost: text("materialcost"),
  laborCost: text("laborcost"),
  overheadCost: text("overheadcost"),
  totalCost: text("totalcost"),
  currency: text("currency"),
  analysisDate: timestamp("analysisdate"),
  notes: text("notes"),
  createdAt: timestamp("createdat"),
  updatedAt: timestamp("updatedat"),
  tankName: text("tankname"),
  tankType: text("tanktype"),
  capacity: integer("capacity"),
  height: integer("height"),
  tankSpecificationId: text("tankspecificationid"),
}).existing();

export const v_cost_analysis_materials = vespro.view("v_cost_analysis_materials", {
  id: text("id"),
  costAnalysisId: text("costanalysisid"),
  materialId: text("materialid"),
  quantity: numeric("quantity"),
  totalCost: numeric("totalcost"),
  material: jsonb("material"),
}).existing();

export const v_dashboard_stats = vespro.view("v_dashboard_stats", {
  totalReports: integer("totalreports"),
  tankModels: integer("tankmodels"),
  averageCost: integer("averagecost"),
  monthlyReports: integer("monthlyreports"),
}).existing();

// Original tables (keeping for backward compatibility)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const tankSpecifications = pgTable("tank_specifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  type: text("type").notNull(), // Storage Tank, Pressure Vessel, Heat Exchanger
  capacity: integer("capacity").notNull(), // in liters
  height: integer("height").notNull(), // in mm
  diameter: integer("diameter"), // in mm
  width: integer("width"), // in mm - Excel form has width separately
  // Excel-aligned pressure and temperature fields
  pressure: decimal("pressure", { precision: 10, scale: 2 }), // in bar (numeric)
  pressure_text: text("pressure_text"), // Excel format like "0 BAR"
  temperature: decimal("temperature", { precision: 10, scale: 2 }), // in celsius (numeric)
  temperature_text: text("temperature_text"), // Excel format like "SICAKLIK"
  // Excel-aligned material fields
  material: text("material").notNull(), // Steel grade (backward compatibility)
  material_type: text("material_type"), // Excel: material type like "EVATHERM"
  material_grade: text("material_grade"), // Excel: material grade like "super duplex-1.4410"
  thickness: decimal("thickness", { precision: 10, scale: 2 }), // in mm
  // Additional Excel-derived fields
  volume_calculated: numeric("volume_calculated"), // Calculated from dimensions
  surface_area: numeric("surface_area"), // Calculated surface area
  drawing_reference: text("drawing_reference"), // Excel form code reference
  features: jsonb("features"), // Additional features as JSON
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const costAnalyses = pgTable("cost_analyses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reportId: text("report_id").notNull().unique(),
  tankSpecificationId: varchar("tank_specification_id").references(() => tankSpecifications.id),
  materialCost: decimal("material_cost", { precision: 12, scale: 2 }).notNull(),
  laborCost: decimal("labor_cost", { precision: 12, scale: 2 }).notNull(),
  overheadCost: decimal("overhead_cost", { precision: 12, scale: 2 }).notNull(),
  totalCost: decimal("total_cost", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency").default("EUR"),
  analysisDate: timestamp("analysis_date").defaultNow(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const materials = pgTable("materials", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  category: text("category").notNull(), // Steel Sheets, Nozzles, Flanges, etc.
  unit: text("unit").notNull(), // kg, pieces, meters
  unitCost: decimal("unit_cost", { precision: 10, scale: 2 }).notNull(),
  supplier: text("supplier"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const costAnalysisMaterials = pgTable("cost_analysis_materials", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  costAnalysisId: varchar("cost_analysis_id").references(() => costAnalyses.id),
  materialId: varchar("material_id").references(() => materials.id),
  quantity: decimal("quantity", { precision: 10, scale: 3 }).notNull(),
  totalCost: decimal("total_cost", { precision: 10, scale: 2 }).notNull(),
});

export const settings = pgTable("settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id), // null for global settings
  settingsType: text("settings_type").notNull().default("global"), // "user" or "global"
  language: text("language").notNull().default("tr"), // "tr" or "en"
  currency: text("currency").notNull().default("EUR"), // "USD", "EUR", "TRY"
  // Cost calculation parameters
  materialCostMultiplier: decimal("material_cost_multiplier", { precision: 5, scale: 3 }).default("1.000"),
  laborCostMultiplier: decimal("labor_cost_multiplier", { precision: 5, scale: 3 }).default("1.000"),
  overheadCostMultiplier: decimal("overhead_cost_multiplier", { precision: 5, scale: 3 }).default("1.000"),
  // Additional cost parameters for AI analysis
  steelPricePerKg: decimal("steel_price_per_kg", { precision: 10, scale: 2 }).default("2.50"), // EUR per kg
  hourlyLaborRate: decimal("hourly_labor_rate", { precision: 10, scale: 2 }).default("25.00"), // EUR per hour
  overheadPercentage: decimal("overhead_percentage", { precision: 5, scale: 2 }).default("15.00"), // 15%
  // Currency exchange rates (base currency is EUR)
  eurToUsdRate: decimal("eur_to_usd_rate", { precision: 8, scale: 4 }).default("1.0800"),
  tryToUsdRate: decimal("try_to_usd_rate", { precision: 8, scale: 4 }).default("0.0300"),
  // AI analysis preferences
  autoAnalysisEnabled: boolean("auto_analysis_enabled").default(true),
  analysisConfidenceThreshold: decimal("analysis_confidence_threshold", { precision: 3, scale: 2 }).default("0.80"), // 80%
  // n8n Agent integration
  n8nEndpoint: text("n8n_endpoint"), // n8n webhook URL
  n8nApiKey: text("n8n_api_key"), // n8n API key (server-only)
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Chat message role enum
export const messageRoleEnum = pgEnum("message_role", ["user", "assistant", "system"]);

// Chat sessions table
export const chatSessions = pgTable("chat_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id), // null for anonymous sessions
  lastFormId: varchar("last_form_id").references(() => turkishCostAnalyses.id), // Link to last analyzed form
  title: text("title"), // Optional session title
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Chat messages table
export const chatMessages = pgTable("chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => chatSessions.id, { onDelete: "cascade" }),
  role: messageRoleEnum("role").notNull(),
  content: text("content").notNull(),
  tokens: integer("tokens"), // Track token usage for cost monitoring
  agentRunId: text("agent_run_id"), // n8n run ID for traceability
  createdAt: timestamp("created_at").defaultNow(),
});

// NEW CLEAN SCHEMA FOR TURKISH COST ANALYSIS FORMS
export const turkishCostAnalyses = pgTable("turkish_cost_analyses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  // Form Information
  form_code: text("form_code").notNull(),
  client_name: text("client_name").notNull(),
  form_title: text("form_title").notNull(),
  form_date: date("form_date").notNull(),
  revision_no: integer("revision_no").default(0),
  currency: text("currency").default("EUR"),
  
  // Turkish Tank Specifications
  tank_name: text("tank_name").notNull(),
  tank_capi: numeric("tank_capi").notNull(), // Tank çapı (mm)
  silindirik_yukseklik: numeric("silindirik_yukseklik").notNull(), // Silindirik yükseklik (mm)
  insulation: text("insulation").notNull(), // "var" or "yok"
  karistirici: text("karistirici").notNull(), // "var" or "yok" 
  ceket_serpantin: text("ceket_serpantin").notNull(), // "var" or "yok"
  volume: numeric("volume").notNull(), // m³
  malzeme_kalitesi: text("malzeme_kalitesi").notNull(), // Malzeme kalitesi
  basinc: text("basinc").notNull(), // Basınç (Sami)
  govde_acinimi: numeric("govde_acinimi").notNull(), // Gövde açınımı
  sicaklik: numeric("sicaklik").notNull(), // Sıcaklık (°C)
  
  // Additional fields
  notes: text("notes"),
  
  // Calculated totals
  total_cost: numeric("total_cost", { precision: 12, scale: 2 }),
  
  // Timestamps
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const turkishCostItems = pgTable("turkish_cost_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  analysis_id: varchar("analysis_id").notNull().references(() => turkishCostAnalyses.id, { onDelete: "cascade" }),
  
  // Turkish Cost Item Fields
  maliyet_faktoru: text("maliyet_faktoru").notNull(), // MALİYET FAKTÖRÜ
  malzeme_kalitesi_item: text("malzeme_kalitesi_item"), // MALZEME KALİTESİ (string or number as text)
  malzeme_tipi: text("malzeme_tipi"), // MALZEME TİPİ
  adet: numeric("adet").notNull(), // Adet
  toplam_miktar: numeric("toplam_miktar").notNull(), // TOPLAM MİKTAR
  birim: text("birim").notNull(), // BİRİM (kg, adet, m, m², m³, set)
  birim_fiyat_euro: numeric("birim_fiyat_euro", { precision: 10, scale: 2 }).notNull(), // BİRİM FİYAT EURO
  
  // Calculated field
  item_total_price: numeric("item_total_price", { precision: 12, scale: 2 }),
  
  created_at: timestamp("created_at").defaultNow(),
});

// Relations
export const tankSpecificationsRelations = relations(tankSpecifications, ({ many }) => ({
  costAnalyses: many(costAnalyses),
}));

export const costAnalysesRelations = relations(costAnalyses, ({ one, many }) => ({
  tankSpecification: one(tankSpecifications, {
    fields: [costAnalyses.tankSpecificationId],
    references: [tankSpecifications.id],
  }),
  materials: many(costAnalysisMaterials),
}));

export const materialsRelations = relations(materials, ({ many }) => ({
  costAnalyses: many(costAnalysisMaterials),
}));

export const costAnalysisMaterialsRelations = relations(costAnalysisMaterials, ({ one }) => ({
  costAnalysis: one(costAnalyses, {
    fields: [costAnalysisMaterials.costAnalysisId],
    references: [costAnalyses.id],
  }),
  material: one(materials, {
    fields: [costAnalysisMaterials.materialId],
    references: [materials.id],
  }),
}));

// New Turkish relations - defined after tables
export const turkishCostAnalysesRelations = relations(turkishCostAnalyses, ({ many }) => ({
  costItems: many(turkishCostItems),
}));

export const turkishCostItemsRelations = relations(turkishCostItems, ({ one }) => ({
  analysis: one(turkishCostAnalyses, {
    fields: [turkishCostItems.analysis_id],
    references: [turkishCostAnalyses.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertTankSpecificationSchema = createInsertSchema(tankSpecifications).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});
export const insertCostAnalysisSchema = createInsertSchema(costAnalyses).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});
export const insertMaterialSchema = createInsertSchema(materials).omit({ 
  id: true, 
  createdAt: true 
});
export const insertCostAnalysisMaterialSchema = createInsertSchema(costAnalysisMaterials).omit({ 
  id: true 
});
export const insertSettingsSchema = createInsertSchema(settings).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});
export const insertChatSessionSchema = createInsertSchema(chatSessions).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});
export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({ 
  id: true, 
  createdAt: true 
});

// New Turkish schemas with proper number handling
export const insertTurkishCostAnalysisSchema = z.object({
  // Form Information - keep as is
  form_code: z.string(),
  client_name: z.string(),
  form_title: z.string(),
  form_date: z.string(),
  revision_no: z.number().optional(),
  currency: z.string().optional(),
  
  // Turkish Tank Specifications - convert numbers to strings
  tank_name: z.string(),
  tank_capi: z.number().transform(val => val.toString()),
  silindirik_yukseklik: z.number().transform(val => val.toString()),
  insulation: z.string(),
  karistirici: z.string(),
  ceket_serpantin: z.string(),
  volume: z.number().transform(val => val.toString()),
  malzeme_kalitesi: z.string(),
  basinc: z.string(),
  govde_acinimi: z.number().transform(val => val.toString()),
  sicaklik: z.number().transform(val => val.toString()),
  
  // Additional fields
  notes: z.string().optional(),
});

export const insertTurkishCostItemSchema = z.object({
  analysis_id: z.string(),
  
  // Turkish Cost Item Fields - convert numbers to strings for numeric fields
  maliyet_faktoru: z.string(),
  malzeme_kalitesi_item: z.string().optional(),
  malzeme_tipi: z.string().optional(),
  adet: z.number().transform(val => val.toString()),
  toplam_miktar: z.number().transform(val => val.toString()),
  birim: z.string(),
  birim_fiyat_euro: z.number().transform(val => val.toString()),
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type TankSpecification = typeof tankSpecifications.$inferSelect;
export type InsertTankSpecification = z.infer<typeof insertTankSpecificationSchema>;
export type CostAnalysis = typeof costAnalyses.$inferSelect;
export type InsertCostAnalysis = z.infer<typeof insertCostAnalysisSchema>;
export type Material = typeof materials.$inferSelect;
export type InsertMaterial = z.infer<typeof insertMaterialSchema>;
export type CostAnalysisMaterial = typeof costAnalysisMaterials.$inferSelect;
export type InsertCostAnalysisMaterial = z.infer<typeof insertCostAnalysisMaterialSchema>;
export type Settings = typeof settings.$inferSelect;
export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type ChatSession = typeof chatSessions.$inferSelect;
export type InsertChatSession = z.infer<typeof insertChatSessionSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;

// New Turkish types
export type TurkishCostAnalysis = typeof turkishCostAnalyses.$inferSelect;
export type InsertTurkishCostAnalysis = z.infer<typeof insertTurkishCostAnalysisSchema>;
export type TurkishCostItem = typeof turkishCostItems.$inferSelect;
export type InsertTurkishCostItem = z.infer<typeof insertTurkishCostItemSchema>;

// Vespro insert schemas
export const insertVesproFormSchema = createInsertSchema(vespro_forms).omit({ 
  form_id: true, 
  created_at: true 
});
export const insertVesproMaterialSchema = createInsertSchema(vespro_materials).omit({ 
  material_id: true 
});
export const insertVesproCostGroupSchema = createInsertSchema(vespro_cost_groups).omit({ 
  group_id: true 
});
export const insertVesproCostItemSchema = createInsertSchema(vespro_cost_items).omit({ 
  item_id: true 
});

// Vespro types
export type VesproForm = typeof vespro_forms.$inferSelect;
export type InsertVesproForm = z.infer<typeof insertVesproFormSchema>;
export type VesproMaterial = typeof vespro_materials.$inferSelect;
export type InsertVesproMaterial = z.infer<typeof insertVesproMaterialSchema>;
export type VesproCostGroup = typeof vespro_cost_groups.$inferSelect;
export type InsertVesproCostGroup = z.infer<typeof insertVesproCostGroupSchema>;
export type VesproCostItem = typeof vespro_cost_items.$inferSelect;
export type InsertVesproCostItem = z.infer<typeof insertVesproCostItemSchema>;

// ================================
// NEW TANK ORDER SCHEMA
// ================================

// Dictionary tables
export const uomUnit = pgTable("uom_unit", {
  id: smallserial("id").primaryKey(),
  code: text("code").unique().notNull(),
  label: text("label"),
});

export const materialQuality = pgTable("material_quality", {
  id: smallserial("id").primaryKey(),
  name: text("name").unique().notNull(),
  note: text("note"),
});

export const materialTypeDict = pgTable("material_type", {
  id: smallserial("id").primaryKey(),
  name: text("name").unique().notNull(),
  note: text("note"),
});

// Sheet upload tracking
export const sheetUpload = pgTable("sheet_upload", {
  id: bigserial("id", { mode: "bigint" }).primaryKey(),
  filename: text("filename").notNull(),
  sheet_name: text("sheet_name").notNull(),
  uploaded_at: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow(),
  file_hash_sha1: text("file_hash_sha1"),
  first_data_row: integer("first_data_row").default(8),
  last_data_row: integer("last_data_row"),
  file_path: text("file_path"),
});

// Tank order main table
export const tankOrder = pgTable("tank_order", {
  id: bigserial("id", { mode: "bigint" }).primaryKey(),
  source_sheet_id: bigint("source_sheet_id", { mode: "bigint" }).references(() => sheetUpload.id, { onDelete: "set null" }),
  
  sheet_name: text("sheet_name"),
  sheet_index: integer("sheet_index"),
  source_kind: text("source_kind").default("Manual"),
  source_filename: text("source_filename"),
  
  order_code: text("order_code").unique(),
  customer_name: text("customer_name"),
  project_code: text("project_code"),
  material_grade: text("material_grade"),
  quantity: numeric("quantity"),
  
  diameter_mm: numeric("diameter_mm", { precision: 12, scale: 3 }),
  length_mm: numeric("length_mm", { precision: 12, scale: 3 }),
  pressure_text: text("pressure_text"),
  pressure_bar: numeric("pressure_bar", { precision: 10, scale: 3 }),
  
  volume: numeric("volume", { precision: 12, scale: 3 }),
  labor_eur: numeric("labor_eur", { precision: 14, scale: 2 }),
  outsource_eur: numeric("outsource_eur", { precision: 14, scale: 2 }),
  
  total_weight_kg: numeric("total_weight_kg", { precision: 14, scale: 3 }),
  total_price_eur: numeric("total_price_eur", { precision: 14, scale: 2 }),
  created_date: date("created_date"),
  
  revision_text: text("revision_text"),
  revision_no: text("revision_no"),
  category_label: text("category_label"),
  temperature_c: numeric("temperature_c", { precision: 8, scale: 2 }),
  
  extra_head_json: jsonb("extra_head_json"),
  
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Tank order header raw data
export const tankOrderHeaderRaw = pgTable("tank_order_header_raw", {
  id: bigserial("id", { mode: "bigint" }).primaryKey(),
  order_id: bigint("order_id", { mode: "bigint" }).notNull().references(() => tankOrder.id, { onDelete: "cascade" }),
  excel_col_idx: integer("excel_col_idx").notNull(),
  excel_row_idx: integer("excel_row_idx").notNull(),
  cell_a1: text("cell_a1"),
  raw_value: text("raw_value"),
});

// Cost item table
export const costItem = pgTable("cost_item", {
  id: bigserial("id", { mode: "bigint" }).primaryKey(),
  order_id: bigint("order_id", { mode: "bigint" }).notNull().references(() => tankOrder.id, { onDelete: "cascade" }),
  
  group_no: integer("group_no"),
  line_no: integer("line_no"),
  factor_name: text("factor_name"),
  
  material_quality_id: smallint("material_quality_id").references(() => materialQuality.id, { onDelete: "set null" }),
  material_type_id: smallint("material_type_id").references(() => materialTypeDict.id, { onDelete: "set null" }),
  
  dim_g_mm: numeric("dim_g_mm", { precision: 12, scale: 3 }),
  dim_h_mm: numeric("dim_h_mm", { precision: 12, scale: 3 }),
  dim_i_mm_kg: numeric("dim_i_mm_kg", { precision: 12, scale: 3 }),
  kg_per_m: numeric("kg_per_m", { precision: 12, scale: 5 }),
  
  quantity: numeric("quantity", { precision: 14, scale: 3 }),
  total_qty: numeric("total_qty", { precision: 14, scale: 3 }),
  unit_id: smallint("unit_id").references(() => uomUnit.id),
  
  unit_price_eur: numeric("unit_price_eur", { precision: 14, scale: 4 }),
  line_total_eur: numeric("line_total_eur", { precision: 14, scale: 2 }),
  
  material_status: text("material_status"),
  is_atolye_iscilik: boolean("is_atolye_iscilik"),
  is_dis_tedarik: boolean("is_dis_tedarik"),
  is_atolye_iscilik_2: boolean("is_atolye_iscilik_2"),
  
  note: text("note"),
});

// Cost item raw data
export const costItemRaw = pgTable("cost_item_raw", {
  id: bigserial("id", { mode: "bigint" }).primaryKey(),
  order_id: bigserial("order_id", { mode: "bigint" }).notNull().references(() => tankOrder.id, { onDelete: "cascade" }),
  row_idx: integer("row_idx").notNull(),
  col_b_to_t_json: jsonb("col_b_to_t_json"),
});

// Labor tables
export const laborRole = pgTable("labor_role", {
  id: smallserial("id").primaryKey(),
  role_name: text("role_name").unique().notNull(),
  description: text("description"),
});

export const laborRate = pgTable("labor_rate", {
  id: bigserial("id", { mode: "bigint" }).primaryKey(),
  role_id: smallint("role_id").notNull().references(() => laborRole.id, { onDelete: "cascade" }),
  valid_from: date("valid_from").notNull(),
  valid_to: date("valid_to"),
  day_rate_eur: numeric("day_rate_eur", { precision: 12, scale: 2 }).notNull(),
});

export const laborLog = pgTable("labor_log", {
  id: bigserial("id", { mode: "bigint" }).primaryKey(),
  order_id: bigserial("order_id", { mode: "bigint" }).notNull().references(() => tankOrder.id, { onDelete: "cascade" }),
  role_id: smallint("role_id").notNull().references(() => laborRole.id, { onDelete: "restrict" }),
  work_type: text("work_type"),
  work_date: date("work_date").notNull(),
  man_days: numeric("man_days", { precision: 8, scale: 3 }).notNull(),
  note: text("note"),
});

// Insert schemas for new tables
export const insertTankOrderSchema = createInsertSchema(tankOrder).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const insertCostItemSchema = createInsertSchema(costItem).omit({
  id: true,
});

export const insertSheetUploadSchema = createInsertSchema(sheetUpload).omit({
  id: true,
  uploaded_at: true,
});

// Types for new tables
export type TankOrder = typeof tankOrder.$inferSelect;
export type InsertTankOrder = z.infer<typeof insertTankOrderSchema>;
export type CostItem = typeof costItem.$inferSelect;
export type InsertCostItem = z.infer<typeof insertCostItemSchema>;
export type SheetUpload = typeof sheetUpload.$inferSelect;
export type InsertSheetUpload = z.infer<typeof insertSheetUploadSchema>;