import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, decimal, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

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
