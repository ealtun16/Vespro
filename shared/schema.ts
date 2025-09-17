import { sql, relations } from "drizzle-orm";
import { pgTable, pgSchema, pgEnum, pgView, text, varchar, decimal, integer, timestamp, jsonb, uuid, bigserial, boolean, numeric, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Vespro schema
export const vespro = pgSchema("vespro");

// Vespro enums (schema-qualified)
export const categoryType = vespro.enum("category_type", ["ATOLYE_ISCILIK", "DIS_TEDARIK"]);
export const uom = vespro.enum("uom", ["kg", "adet", "m", "mm", "m2", "m3", "set", "pcs", "ton", "lt", "piece", "other"]);

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
  pressure: decimal("pressure", { precision: 10, scale: 2 }), // in bar
  temperature: decimal("temperature", { precision: 10, scale: 2 }), // in celsius
  material: text("material").notNull(), // Steel grade
  thickness: decimal("thickness", { precision: 10, scale: 2 }), // in mm
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
  currency: text("currency").default("USD"),
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
