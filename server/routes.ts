import type { Express, Request } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertCostAnalysisSchema, insertTankSpecificationSchema, insertMaterialSchema, insertSettingsSchema, insertTurkishCostAnalysisSchema, insertTurkishCostItemSchema } from "@shared/schema";
import * as XLSX from "xlsx";
import { CostAnalysisEngine } from "./cost-analysis-engine";
import multer from "multer";
import crypto from "crypto";
import path from "path";
import fs from "fs";

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer configuration for Excel upload - save to disk with original filename
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
      // Keep original filename and extension exactly as uploaded
      const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
      cb(null, originalName);
    }
  }),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.mimetype === 'application/vnd.ms-excel') {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files are allowed'));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Serve uploaded files - use express.static for secure file serving
  app.use('/uploads', express.static(uploadsDir, { 
    index: false,
    dotfiles: 'deny'
  }));

  // Dashboard stats
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Tank Specifications routes
  app.get("/api/tank-specifications", async (req, res) => {
    try {
      const specs = await storage.getAllTankSpecifications();
      res.json(specs);
    } catch (error) {
      console.error("Error fetching tank specifications:", error);
      res.status(500).json({ message: "Failed to fetch tank specifications" });
    }
  });

  app.get("/api/tank-specifications/:id", async (req, res) => {
    try {
      const spec = await storage.getTankSpecification(req.params.id);
      if (!spec) {
        return res.status(404).json({ message: "Tank specification not found" });
      }
      res.json(spec);
    } catch (error) {
      console.error("Error fetching tank specification:", error);
      res.status(500).json({ message: "Failed to fetch tank specification" });
    }
  });

  app.post("/api/tank-specifications", async (req, res) => {
    try {
      const validatedData = insertTankSpecificationSchema.parse(req.body);
      const spec = await storage.createTankSpecification(validatedData);
      
      res.status(201).json(spec);
    } catch (error) {
      console.error("Error creating tank specification:", error);
      res.status(400).json({ message: "Invalid tank specification data" });
    }
  });

  app.put("/api/tank-specifications/:id", async (req, res) => {
    try {
      const validatedData = insertTankSpecificationSchema.partial().parse(req.body);
      const spec = await storage.updateTankSpecification(req.params.id, validatedData);
      if (!spec) {
        return res.status(404).json({ message: "Tank specification not found" });
      }
      res.json(spec);
    } catch (error) {
      console.error("Error updating tank specification:", error);
      res.status(400).json({ message: "Invalid tank specification data" });
    }
  });

  app.delete("/api/tank-specifications/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteTankSpecification(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Tank specification not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting tank specification:", error);
      res.status(500).json({ message: "Failed to delete tank specification" });
    }
  });

  // Cost Analysis routes
  app.get("/api/cost-analyses", async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = (req.query.search as string) || '';
      const tankType = (req.query.tankType as string) || '';
      
      const result = await storage.getAllCostAnalyses(page, limit, search, tankType);
      res.json(result);
    } catch (error) {
      console.error("Error fetching cost analyses:", error);
      res.status(500).json({ message: "Failed to fetch cost analyses" });
    }
  });

  // Get individual cost analysis detail
  app.get("/api/cost-analyses/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const analysis = await storage.getCostAnalysisWithDetails(id);
      
      if (!analysis) {
        return res.status(404).json({ message: "Cost analysis not found" });
      }
      
      res.json(analysis);
    } catch (error) {
      console.error("Error fetching cost analysis detail:", error);
      res.status(500).json({ message: "Failed to fetch cost analysis detail" });
    }
  });

  app.post("/api/cost-analyses", async (req, res) => {
    try {
      const validatedData = insertCostAnalysisSchema.parse(req.body);
      const analysis = await storage.createCostAnalysis(validatedData);
      res.status(201).json(analysis);
    } catch (error) {
      console.error("Error creating cost analysis:", error);
      res.status(400).json({ message: "Invalid cost analysis data" });
    }
  });

  // Materials routes
  app.get("/api/materials", async (req, res) => {
    try {
      const materials = await storage.getAllMaterials();
      res.json(materials);
    } catch (error) {
      console.error("Error fetching materials:", error);
      res.status(500).json({ message: "Failed to fetch materials" });
    }
  });

  app.post("/api/materials", async (req, res) => {
    try {
      const validatedData = insertMaterialSchema.parse(req.body);
      const material = await storage.createMaterial(validatedData);
      res.status(201).json(material);
    } catch (error) {
      console.error("Error creating material:", error);
      res.status(400).json({ message: "Invalid material data" });
    }
  });

  // Vespro Forms routes removed - replaced with manual data entry

  // Excel Import route removed - replaced with manual data entry

  // Excel Export route
  app.get("/api/export/excel", async (req, res) => {
    try {
      // Initialize workbook and worksheet
      const workbook = XLSX.utils.book_new();
      let worksheet: any = null;
      
      const chunkSize = 50;
      let page = 1;
      let totalProcessed = 0;
      let hasMore = true;

      while (hasMore) {
        const { analyses, total } = await storage.getAllCostAnalyses(page, chunkSize);
        
        if (analyses.length === 0) {
          hasMore = false;
          break;
        }

        const exportData = analyses.map((analysis: any) => ({
          'Report ID': analysis.reportId,
          'Tank Type': analysis.tankType || 'N/A',
          'Tank Name': analysis.tankName || 'N/A',
          'Capacity (L)': analysis.capacity || 0,
          'Height (mm)': analysis.height || 0,
          'Material Cost': analysis.materialCost,
          'Labor Cost': analysis.laborCost,
          'Overhead Cost': analysis.overheadCost,
          'Total Cost': analysis.totalCost,
          'Analysis Date': analysis.analysisDate?.toISOString().split('T')[0],
        }));

        // Create worksheet from first chunk, append to existing worksheet for subsequent chunks
        if (worksheet === null) {
          worksheet = XLSX.utils.json_to_sheet(exportData);
        } else {
          XLSX.utils.sheet_add_json(worksheet, exportData, { skipHeader: true, origin: -1 });
        }
        
        totalProcessed += analyses.length;
        
        // Check if we've processed all records
        if (page * chunkSize >= total || analyses.length < chunkSize) {
          hasMore = false;
        }
        
        page++;
      }

      // Handle case where no data was found
      if (worksheet === null) {
        worksheet = XLSX.utils.json_to_sheet([]);
      }

      XLSX.utils.book_append_sheet(workbook, worksheet, 'Cost Analysis');
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      res.setHeader('Content-Disposition', 'attachment; filename=cost-analysis-export.xlsx');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.send(buffer);
      
      console.log(`Export completed: ${totalProcessed} records exported`);
    } catch (error) {
      console.error("Error exporting Excel file:", error);
      res.status(500).json({ message: "Failed to export Excel file" });
    }
  });

  // Settings endpoints
  app.get('/api/settings', async (req, res) => {
    try {
      const userId = req.query.userId as string;
      const settings = await storage.getSettings(userId);
      
      // If no settings exist, create default global settings
      if (!settings) {
        const defaultSettings = await storage.createSettings({
          settingsType: "global",
          language: "tr",
          currency: "EUR"
        });
        return res.json(defaultSettings);
      }
      
      res.json(settings);
    } catch (error) {
      console.error('Error fetching settings:', error);
      res.status(500).json({ error: 'Failed to fetch settings' });
    }
  });

  app.put('/api/settings/:id', async (req, res) => {
    try {
      const { id } = req.params;
      
      // Validate request body against schema
      const updateData = insertSettingsSchema.partial().parse(req.body);
      
      const updatedSettings = await storage.updateSettings(id, updateData);
      if (!updatedSettings) {
        return res.status(404).json({ error: 'Settings not found' });
      }
      
      res.json(updatedSettings);
    } catch (error) {
      console.error('Error updating settings:', error);
      res.status(500).json({ error: 'Failed to update settings' });
    }
  });

  app.post('/api/settings', async (req, res) => {
    try {
      const settingsData = insertSettingsSchema.parse(req.body);
      const newSettings = await storage.createSettings(settingsData);
      res.status(201).json(newSettings);
    } catch (error) {
      console.error('Error creating settings:', error);
      if (error instanceof Error && error.name === 'ZodError') {
        res.status(400).json({ error: 'Invalid settings data', details: (error as any).issues });
      } else {
        res.status(500).json({ error: 'Failed to create settings' });
      }
    }
  });

  // AI Auto-Analysis endpoint
  app.post('/api/ai-analysis/calculate', async (req, res) => {
    try {
      // Validate tank specification input
      const tankSpecData = insertTankSpecificationSchema.parse(req.body.tankSpec);
      
      // Get global settings for cost parameters
      const globalSettings = await storage.getGlobalSettings();
      if (!globalSettings) {
        return res.status(400).json({ 
          error: 'Global settings not configured. Please configure cost parameters in Settings.' 
        });
      }

      // Calculate costs using AI engine
      const costBreakdown = await CostAnalysisEngine.calculateCosts({
        tankSpec: tankSpecData,
        settings: globalSettings
      });

      // Generate auto cost analysis record
      const autoCostAnalysis = CostAnalysisEngine.generateAutoCostAnalysis(
        tankSpecData, 
        costBreakdown
      );

      res.json({
        breakdown: costBreakdown,
        analysis: autoCostAnalysis,
        message: 'Cost analysis calculated successfully by AI agent'
      });
      
    } catch (error: any) {
      console.error('AI Analysis calculation error:', error);
      if (error?.name === 'ZodError' && error?.issues) {
        res.status(400).json({ 
          error: 'Invalid tank specification data', 
          details: error.issues 
        });
      } else {
        res.status(500).json({ error: 'Failed to calculate cost analysis' });
      }
    }
  });

  // AI Auto-Analysis with tank creation and cost analysis
  app.post('/api/ai-analysis/full-analysis', async (req, res) => {
    try {
      // Validate tank specification input
      const tankSpecData = insertTankSpecificationSchema.parse(req.body.tankSpec);
      
      // Get global settings
      const globalSettings = await storage.getGlobalSettings();
      if (!globalSettings) {
        return res.status(400).json({ 
          error: 'Global settings not configured. Please configure cost parameters in Settings.' 
        });
      }

      // Step 1: Create tank specification
      const createdTank = await storage.createTankSpecification(tankSpecData);

      // Step 2: Calculate costs using AI engine
      const costBreakdown = await CostAnalysisEngine.calculateCosts({
        tankSpec: {
          ...createdTank,
          features: createdTank.features as any
        },
        settings: globalSettings
      });

      // Step 3: Generate and save auto cost analysis
      const autoCostAnalysis = CostAnalysisEngine.generateAutoCostAnalysis(
        {
          ...createdTank,
          features: createdTank.features as any
        }, 
        costBreakdown
      );
      
      // Link to created tank
      autoCostAnalysis.tankSpecificationId = createdTank.id;
      
      const savedAnalysis = await storage.createAutoCostAnalysis(autoCostAnalysis);

      res.status(201).json({
        tank: createdTank,
        analysis: savedAnalysis,
        breakdown: costBreakdown,
        message: 'Tank created and cost analysis completed by AI agent'
      });
      
    } catch (error) {
      console.error('AI Full Analysis error:', error);
      if (error instanceof Error && error.name === 'ZodError') {
        res.status(400).json({ 
          error: 'Invalid tank specification data', 
          details: (error as any).issues 
        });
      } else {
        res.status(500).json({ error: 'Failed to complete full analysis' });
      }
    }
  });

  // Vespro form routes for manual data entry
  app.post('/api/vespro/forms', async (req, res) => {
    try {
      const vesproForm = await storage.createVesproForm(req.body);
      res.json(vesproForm);
    } catch (error) {
      console.error('Error creating Vespro form:', error);
      res.status(500).json({ error: 'Failed to create Vespro form' });
    }
  });

  app.post('/api/vespro/cost-items', async (req, res) => {
    try {
      const { items } = req.body;
      const costItems = await storage.createVesproCostItems(items);
      res.json(costItems);
    } catch (error) {
      console.error('Error creating cost items:', error);
      res.status(500).json({ error: 'Failed to create cost items' });
    }
  });

  app.get('/api/vespro/forms', async (req, res) => {
    try {
      const forms = await storage.getAllVesproForms();
      res.json(forms);
    } catch (error) {
      console.error('Error fetching Vespro forms:', error);
      res.status(500).json({ error: 'Failed to fetch Vespro forms' });
    }
  });

  // ========================================
  // NEW TURKISH COST ANALYSIS ROUTES
  // ========================================

  // Get all Turkish cost analyses
  app.get("/api/turkish-cost-analyses", async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = (req.query.search as string) || '';
      
      const result = await storage.getAllTurkishCostAnalyses(page, limit, search);
      res.json(result);
    } catch (error) {
      console.error("Error fetching Turkish cost analyses:", error);
      res.status(500).json({ message: "Failed to fetch Turkish cost analyses" });
    }
  });

  // Get individual Turkish cost analysis with items
  app.get("/api/turkish-cost-analyses/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const result = await storage.getTurkishCostAnalysisWithItems(id);
      
      if (!result) {
        return res.status(404).json({ message: "Turkish cost analysis not found" });
      }
      
      res.json(result);
    } catch (error) {
      console.error("Error fetching Turkish cost analysis detail:", error);
      res.status(500).json({ message: "Failed to fetch Turkish cost analysis detail" });
    }
  });

  // Create new Turkish cost analysis
  app.post("/api/turkish-cost-analyses", async (req, res) => {
    try {
      console.log("Received Turkish cost analysis data:", JSON.stringify(req.body, null, 2));
      
      const { cost_items, ...analysisData } = req.body;
      
      // Validate analysis data
      console.log("Validating analysis data...");
      const validatedAnalysisData = insertTurkishCostAnalysisSchema.parse(analysisData);
      console.log("Analysis data validated successfully");
      
      // Create the analysis
      console.log("Creating Turkish cost analysis...");
      const analysis = await storage.createTurkishCostAnalysis(validatedAnalysisData);
      console.log("Analysis created with ID:", analysis.id);
      
      // Create cost items if provided
      let createdItems: any[] = [];
      if (cost_items && Array.isArray(cost_items) && cost_items.length > 0) {
        console.log("Creating cost items:", cost_items.length, "items");
        const validatedItems = cost_items.map((item, index) => {
          console.log(`Validating cost item ${index + 1}:`, item);
          return insertTurkishCostItemSchema.parse({
            ...item,
            analysis_id: analysis.id
          });
        });
        
        createdItems = await storage.createTurkishCostItems(validatedItems);
        console.log("Cost items created successfully:", createdItems.length);
      }

      // Calculate total cost
      const totalCost = createdItems.reduce((sum, item) => {
        const itemTotal = Number(item.adet) * Number(item.birim_fiyat_euro);
        return sum + itemTotal;
      }, 0);
      console.log("Total cost calculated:", totalCost);

      // Update analysis with total cost
      const updatedAnalysis = await storage.updateTurkishCostAnalysis(analysis.id, {
        total_cost: totalCost.toString()
      } as any);
      console.log("Analysis updated with total cost");

      res.status(201).json({
        analysis: updatedAnalysis || analysis,
        items: createdItems
      });
    } catch (error: any) {
      console.error("Detailed error creating Turkish cost analysis:");
      console.error("Error message:", error?.message);
      console.error("Error stack:", error?.stack);
      console.error("Request body:", JSON.stringify(req.body, null, 2));
      
      if (error?.name === 'ZodError') {
        console.error("Zod validation errors:", error.errors);
        res.status(400).json({ 
          message: "Form doğrulama hatası",
          errors: error.errors,
          details: error.errors.map((err: any) => `${err.path.join('.')}: ${err.message}`).join(', ')
        });
      } else if (error?.code === '23505') { // PostgreSQL unique constraint error
        res.status(409).json({ 
          message: "Bu form kodu zaten mevcut", 
          details: "Lütfen farklı bir form kodu kullanın" 
        });
      } else if (error?.code && error.code.startsWith('23')) { // Other PostgreSQL constraint errors
        res.status(400).json({ 
          message: "Database kısıtlama hatası", 
          details: error.message 
        });
      } else {
        res.status(500).json({ 
          message: "Türkçe maliyet analizi oluşturulamadı", 
          details: error?.message || "Bilinmeyen hata oluştu"
        });
      }
    }
  });

  // Update Turkish cost analysis
  app.put("/api/turkish-cost-analyses/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { cost_items, ...analysisData } = req.body;
      
      // Validate and update analysis
      const validatedData = insertTurkishCostAnalysisSchema.partial().parse(analysisData);
      const analysis = await storage.updateTurkishCostAnalysis(id, validatedData);
      
      if (!analysis) {
        return res.status(404).json({ message: "Turkish cost analysis not found" });
      }

      // Update cost items if provided
      let updatedItems: any[] = [];
      if (cost_items && Array.isArray(cost_items)) {
        // Delete existing items and create new ones
        await storage.deleteTurkishCostItemsByAnalysisId(id);
        
        if (cost_items.length > 0) {
          const validatedItems = cost_items.map(item => 
            insertTurkishCostItemSchema.parse({
              ...item,
              analysis_id: id
            })
          );
          
          updatedItems = await storage.createTurkishCostItems(validatedItems);
        }

        // Recalculate total cost
        const totalCost = updatedItems.reduce((sum, item) => {
          const itemTotal = Number(item.adet) * Number(item.birim_fiyat_euro);
          return sum + itemTotal;
        }, 0);

        // Update analysis with new total cost (using raw SQL update to bypass type checking)
        await storage.updateTurkishCostAnalysis(id, {
          total_cost: totalCost.toString()
        } as any);
      }
      
      const result = await storage.getTurkishCostAnalysisWithItems(id);
      res.json(result);
    } catch (error) {
      console.error("Error updating Turkish cost analysis:", error);
      res.status(400).json({ message: "Invalid Turkish cost analysis data" });
    }
  });

  // Delete Turkish cost analysis
  app.delete("/api/turkish-cost-analyses/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteTurkishCostAnalysis(id);
      if (!deleted) {
        return res.status(404).json({ message: "Turkish cost analysis not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting Turkish cost analysis:", error);
      res.status(500).json({ message: "Failed to delete Turkish cost analysis" });
    }
  });

  // ========================================
  // TANK ORDERS API (from Excel upload)
  // ========================================
  
  // Get orders list (from view with computed costs)
  app.get("/api/orders/list", async (req, res) => {
    try {
      const orders = await storage.getOrdersList();
      // Convert BigInt IDs to strings for JSON serialization
      const serializedOrders = orders.map((order: any) => ({
        ...order,
        id: String(order.id),
      }));
      res.json({ orders: serializedOrders });
    } catch (error) {
      console.error("Error fetching orders list:", error);
      res.status(500).json({ message: "Failed to fetch orders list" });
    }
  });

  // Get all tank orders (legacy - kept for backward compatibility)
  app.get("/api/tank-orders", async (req, res) => {
    try {
      const orders = await storage.getAllTankOrders();
      // Convert BigInt IDs to strings for JSON serialization
      const serializedOrders = orders.map(order => ({
        ...order,
        id: String(order.id),
        source_sheet_id: order.source_sheet_id ? String(order.source_sheet_id) : null,
      }));
      res.json({ orders: serializedOrders });
    } catch (error) {
      console.error("Error fetching tank orders:", error);
      res.status(500).json({ message: "Failed to fetch tank orders" });
    }
  });

  // Get Excel file for tank order
  app.get("/api/tank-orders/:id/excel", async (req, res) => {
    try {
      const { id } = req.params;
      const orderData = await storage.getTankOrderWithItems(id);
      
      if (!orderData || !orderData.order.source_sheet_id) {
        return res.status(404).json({ message: "Excel file not found" });
      }

      const sheetData = await storage.getSheetUpload(String(orderData.order.source_sheet_id));
      
      if (!sheetData || !sheetData.file_path) {
        return res.status(404).json({ message: "Excel file not found" });
      }

      // Read Excel file from disk
      const filePath = path.join(uploadsDir, sheetData.file_path);
      
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "Excel file not found on disk" });
      }

      const fileBuffer = fs.readFileSync(filePath);
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      
      // Convert to HTML
      const html = XLSX.utils.sheet_to_html(worksheet);
      
      res.json({
        filename: sheetData.filename,
        sheetName: sheetData.sheet_name,
        html: html,
        filePath: `/uploads/${sheetData.file_path}`,
        uploadedAt: sheetData.uploaded_at
      });
    } catch (error) {
      console.error("Error fetching Excel file:", error);
      res.status(500).json({ message: "Failed to fetch Excel file" });
    }
  });

  // Get tank order with cost items
  app.get("/api/tank-orders/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const order = await storage.getTankOrderWithItems(id);
      
      if (!order) {
        return res.status(404).json({ message: "Tank order not found" });
      }
      
      res.json(order);
    } catch (error) {
      console.error("Error fetching tank order:", error);
      res.status(500).json({ message: "Failed to fetch tank order" });
    }
  });

  // Delete tank order
  app.delete("/api/tank-orders/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteTankOrder(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Tank order not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting tank order:", error);
      res.status(500).json({ message: "Failed to delete tank order" });
    }
  });

  // ========================================
  // EXCEL UPLOAD ROUTE 
  // ========================================
  
  // Helper function to safely parse numeric values from Excel
  const parseNumeric = (value: any): string | null => {
    if (value === null || value === undefined || value === '') {
      return null;
    }
    
    // If it's already a number, convert to string
    if (typeof value === 'number') {
      return String(value);
    }
    
    // If it's a string, try to extract numeric value
    if (typeof value === 'string') {
      // Remove common units and text
      const cleaned = value.replace(/[^\d.,-]/g, '').trim();
      if (cleaned === '') {
        return null;
      }
      
      // Check if it's a valid number
      const num = parseFloat(cleaned);
      if (!isNaN(num)) {
        return String(num);
      }
    }
    
    return null;
  };

  // Helper function to safely parse integer values from Excel
  const parseInteger = (value: any): number | null => {
    if (value === null || value === undefined || value === '') {
      return null;
    }
    
    // If it's already a number, round to integer
    if (typeof value === 'number') {
      return Math.round(value);
    }
    
    // If it's a string, try to extract integer value
    if (typeof value === 'string') {
      // Remove all non-numeric characters
      const cleaned = value.replace(/[^\d]/g, '').trim();
      if (cleaned === '') {
        return null;
      }
      
      const num = parseInt(cleaned, 10);
      if (!isNaN(num)) {
        return num;
      }
    }
    
    return null;
  };

  // Helper function to parse Excel date values
  const parseExcelDate = (value: any): string | null => {
    if (value === null || value === undefined || value === '') {
      return null;
    }
    
    // If it's already a Date object
    if (value instanceof Date) {
      return value.toISOString().split('T')[0];
    }
    
    // If it's an Excel serial number (number of days since 1900-01-01)
    if (typeof value === 'number') {
      // Excel epoch: December 30, 1899 (not January 1, 1900 due to Excel's bug)
      const EXCEL_EPOCH = new Date(1899, 11, 30).getTime();
      const date = new Date(EXCEL_EPOCH + value * 86400000);
      return date.toISOString().split('T')[0];
    }
    
    // If it's a string, try to parse it
    if (typeof value === 'string') {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    }
    
    return null;
  };
  
  app.post("/api/excel/upload", upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Log the exact file path
      console.log('Excel file saved to:', req.file.path);

      const stats = {
        rowsProcessed: 0,
        rowsInserted: 0,
        rowsSkipped: 0,
        skippedReasons: [] as string[],
        dictUpserts: { units: 0, qualities: 0, types: 0 }
      };

      // Read Excel file from disk
      const fileBuffer = fs.readFileSync(req.file.path);
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Get the file hash
      const fileHash = crypto
        .createHash('sha1')
        .update(fileBuffer)
        .digest('hex');

      // Create sheet upload record with file path
      const sheetUpload = await storage.createSheetUpload({
        filename: req.file.originalname,
        sheet_name: sheetName,
        file_hash_sha1: fileHash,
        first_data_row: 8,
        last_data_row: null,
        file_path: req.file.filename // Store only filename, not full path
      });

      // Parse header data - FINAL CORRECTED mapping
      // D2=Kod, D3=Müşteri adı, N2=Oluşturma tarihi
      // I2=Tank çapı, K2=Silindir uzunluğu, P2=Satış fiyatı (Toplam €)
      // H3=Hacim, I3=Ürün kalitesi, K3=Basınç, P3=Toplam ağırlık (kg)
      const headerData = {
        order_code: worksheet['D2']?.v || `ORDER-${Date.now()}`,     // D2: Kod
        customer_name: worksheet['D3']?.v || '',                     // D3: Müşteri adı
        project_code: worksheet['H2']?.v || '',
        diameter_mm: parseNumeric(worksheet['I2']?.v),               // I2: Tank çapı
        length_mm: parseNumeric(worksheet['K2']?.v),                 // K2: Silindir uzunluğu
        total_price_eur: parseNumeric(worksheet['P2']?.v),           // P2: Satış fiyatı (Toplam €)
        created_date: parseExcelDate(worksheet['N2']?.v),            // N2: Oluşturma tarihi
        temperature_c: parseNumeric(worksheet['R2']?.v),
        revision_text: worksheet['E3']?.v || '',
        category_label: worksheet['F3']?.v || '',
        quantity: parseNumeric(worksheet['H3']?.v),                  // H3: Hacim
        material_grade: worksheet['I3']?.v || '',                    // I3: Ürün kalitesi
        pressure_bar: parseNumeric(worksheet['K3']?.v),              // K3: Basınç
        total_weight_kg: parseNumeric(worksheet['P3']?.v),           // P3: Toplam ağırlık (kg)
        revision_no: worksheet['P3']?.v || '',
        pressure_text: null,
      };

      // Create tank order
      const tankOrder = await storage.createTankOrder({
        source_sheet_id: sheetUpload.id,
        ...headerData
      });

      // Process cost items starting from row 8 (columns B-T)
      let row = 8;
      let lastDataRow = 7;
      const maxRows = 1000;

      while (row < maxRows) {
        stats.rowsProcessed++;

        // Read all columns B-T
        const colB = worksheet[`B${row}`]?.v; // group_no
        const colC = worksheet[`C${row}`]?.v; // line_no
        const colD = worksheet[`D${row}`]?.v; // factor_name
        const colE = worksheet[`E${row}`]?.v; // material_quality
        const colF = worksheet[`F${row}`]?.v; // material_type
        const colG = worksheet[`G${row}`]?.v; // dim_g_mm
        const colH = worksheet[`H${row}`]?.v; // dim_h_mm
        const colI = worksheet[`I${row}`]?.v; // dim_i_mm_kg
        const colJ = worksheet[`J${row}`]?.v; // kg_per_m
        const colK = worksheet[`K${row}`]?.v; // quantity
        const colL = worksheet[`L${row}`]?.v; // total_qty
        const colM = worksheet[`M${row}`]?.v; // unit
        const colN = worksheet[`N${row}`]?.v; // unit_price_eur
        const colO = worksheet[`O${row}`]?.v; // line_total_eur
        const colP = worksheet[`P${row}`]?.v; // material_status
        const colQ = worksheet[`Q${row}`]?.v; // is_atolye_iscilik
        const colR = worksheet[`R${row}`]?.v; // is_dis_tedarik
        const colS = worksheet[`S${row}`]?.v; // is_atolye_iscilik_2
        const colT = worksheet[`T${row}`]?.v; // note
        
        // If completely empty row, try next
        const hasAnyData = [colB, colC, colD, colE, colF, colG, colH, colI, colJ, colK, colL, colM, colN, colO, colP, colQ, colR, colS, colT].some(v => v !== undefined && v !== null && v !== '');
        
        if (!hasAnyData) {
          row++;
          continue;
        }

        lastDataRow = row;

        // Check if factor_name exists but all side columns are empty
        if (colD) {
          const hasSideData = 
            colE || colF || 
            (colG && parseNumeric(colG)) || 
            (colH && parseNumeric(colH)) || 
            (colI && parseNumeric(colI)) || 
            (colJ && parseNumeric(colJ)) || 
            (colK && parseNumeric(colK)) || 
            (colL && parseNumeric(colL)) || 
            colM || 
            (colN && parseNumeric(colN)) || 
            (colO && parseNumeric(colO)) || 
            colP || 
            colQ || colR || colS || colT;

          if (!hasSideData) {
            stats.rowsSkipped++;
            stats.skippedReasons.push(`Row ${row}: factor_name="${colD}" but all side columns empty`);
            row++;
            continue;
          }

          // Upsert dictionary values
          let unitId = null;
          let qualityId = null;
          let typeId = null;

          if (colM && typeof colM === 'string' && colM.trim()) {
            unitId = await storage.upsertUomUnit(colM.trim());
            stats.dictUpserts.units++;
          }

          if (colE && typeof colE === 'string' && colE.trim()) {
            qualityId = await storage.upsertMaterialQuality(colE.trim());
            stats.dictUpserts.qualities++;
          }

          if (colF && typeof colF === 'string' && colF.trim()) {
            typeId = await storage.upsertMaterialType(colF.trim());
            stats.dictUpserts.types++;
          }

          // Build cost item data
          const costItemData: any = {
            order_id: tankOrder.id,
            group_no: parseInteger(colB),
            line_no: parseInteger(colC),
            factor_name: String(colD || ''),
            material_quality_id: qualityId,
            material_type_id: typeId,
            dim_g_mm: parseNumeric(colG),
            dim_h_mm: parseNumeric(colH),
            dim_i_mm_kg: parseNumeric(colI),
            kg_per_m: parseNumeric(colJ),
            quantity: parseNumeric(colK),
            total_qty: parseNumeric(colL),
            unit_id: unitId,
            unit_price_eur: parseNumeric(colN),
            line_total_eur: parseNumeric(colO),
            material_status: colP ? String(colP) : null,
            is_atolye_iscilik: colQ ? Boolean(colQ) : null,
            is_dis_tedarik: colR ? Boolean(colR) : null,
            is_atolye_iscilik_2: colS ? Boolean(colS) : null,
            note: colT ? String(colT) : null,
          };

          await storage.createCostItem(costItemData);
          stats.rowsInserted++;
        }

        row++;
      }

      // Update sheet upload with last data row
      await storage.updateSheetUpload(String(sheetUpload.id), {
        last_data_row: lastDataRow
      });

      res.json({
        success: true,
        message: "Excel file processed successfully",
        tankOrderId: String(tankOrder.id),
        sheetUploadId: String(sheetUpload.id),
        stats: {
          ...stats,
          lastDataRow
        }
      });

    } catch (error) {
      console.error("Error processing Excel file:", error);
      res.status(500).json({ 
        message: "Failed to process Excel file",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// processExcelData function removed - replaced with manual data entry

/*
async function processExcelData(data: any[], fileBuffer?: Buffer, filename?: string, sheetName?: string): Promise<any[]> {
  const processed: any[] = [];
  
  // Handle Turkish Excel structure
  const rawData = data as any[];
  
  if (rawData.length < 8) {
    console.log('Excel file too short, expected at least 8 rows');
    return processed;
  }

  try {
    // Extract header information from Excel (rows 1-3)
    const formTitle = rawData[0]?.__EMPTY_2 || rawData[0]?.[2] || 'MALİYET ANALİZ FORMU';
    const baseFormCode = rawData[1]?.__EMPTY_2 || rawData[1]?.[2] || `IMP-${Date.now()}`;
    const formCode = sheetName ? `${baseFormCode}-${sheetName}` : baseFormCode;
    const tankName = rawData[1]?.__EMPTY_5 || rawData[1]?.[5] || (sheetName || 'Imported Tank');
    const tankWidth = rawData[1]?.__EMPTY_7 || rawData[1]?.[7];
    const tankHeight = rawData[1]?.__EMPTY_9 || rawData[1]?.[9];
    const tankType = rawData[2]?.__EMPTY_2 || rawData[2]?.[2] || 'Imported Type';
    const materialGrade = rawData[2]?.__EMPTY_6 || rawData[2]?.[6];

    // Prepare file data for storage
    const fileData = fileBuffer ? fileBuffer.toString('base64') : null;
    
    // Create a vespro form for this import
    const vesproForm = await storage.createVesproForm({
      form_code: String(formCode),
      client_name: 'Excel Import',
      form_title: String(formTitle),
      form_date: new Date().toISOString().split('T')[0],
      revision_no: 0,
      currency: 'EUR',
      tank_name: String(tankName),
      tank_type: String(tankType),
      tank_width_mm: tankWidth && !isNaN(Number(tankWidth)) ? String(tankWidth) : null,
      tank_height_mm: tankHeight && !isNaN(Number(tankHeight)) ? String(tankHeight) : null,
      tank_material_grade: materialGrade ? String(materialGrade) : null,
      notes: 'Imported from Excel',
      metadata: {
        importDate: new Date().toISOString(),
        originalData: {
          formTitle,
          formCode,
          tankName,
          tankWidth,
          tankHeight,
          tankType,
          materialGrade
        }
      },
      // Store original Excel file
      original_filename: filename || 'imported_file.xlsx',
      file_data: fileData,
    });

    // Process cost items starting from row 8 (index 7)
    const costItems = [];
    
    for (let i = 7; i < rawData.length; i++) {
      const row = rawData[i];
      if (!row) continue;

      // Extract data from Turkish Excel columns
      const grupNo = row.__EMPTY || row[0];
      const siraNo = row.__EMPTY_1 || row[1];
      const maliyetFaktoru = row.__EMPTY_2 || row[2];
      const malzemeKalitesi = row.__EMPTY_3 || row[3];
      const malzemeTipi = row.__EMPTY_4 || row[4];
      const ebatA = row.__EMPTY_5 || row[5];
      const ebatB = row.__EMPTY_6 || row[6];
      const ebatC = row.__EMPTY_7 || row[7];
      const adet = row.__EMPTY_9 || row[9];
      const toplamMiktar = row.__EMPTY_10 || row[10];
      const birim = row.__EMPTY_11 || row[11];
      const birimFiyat = row.__EMPTY_12 || row[12];
      const toplamFiyat = row.__EMPTY_13 || row[13];

      // Helper function to check if value is numeric
      const isValidNumber = (value: any): boolean => {
        if (value === null || value === undefined || value === '') return false;
        const str = String(value).trim();
        if (str === '') return false;
        // Skip Turkish headers or text entries
        if (str.includes('GİDER') || str.includes('MALIYET') || str.includes('TOPLAM')) return false;
        const num = parseFloat(str);
        return !isNaN(num) && isFinite(num);
      };

      // Helper function to validate UOM values
      const validateUOM = (value: any): string => {
        if (!value) return 'kg'; // default
        const str = String(value).trim().toLowerCase();
        const validUOMs = ['kg', 'adet', 'm', 'mm', 'm2', 'm3', 'set', 'pcs', 'other'];
        return validUOMs.includes(str) ? str : 'kg'; // fallback to kg
      };

      // Only process rows with meaningful data and valid numeric prices
      if (maliyetFaktoru && 
          isValidNumber(birimFiyat) && 
          parseFloat(String(birimFiyat)) > 0) {
        costItems.push({
          form_id: vesproForm.form_id,
          group_no: grupNo && isValidNumber(grupNo) ? parseInt(String(grupNo)) : 1,
          seq_no: siraNo && isValidNumber(siraNo) ? parseInt(String(siraNo)) : costItems.length + 1,
          cost_factor: String(maliyetFaktoru),
          material_quality: malzemeKalitesi ? String(malzemeKalitesi) : null,
          material_type: malzemeTipi ? String(malzemeTipi) : null,
          dim_a_mm: ebatA && isValidNumber(ebatA) ? String(ebatA) : null,
          dim_b_mm: ebatB && isValidNumber(ebatB) ? String(ebatB) : null,
          dim_c_thickness_mm: ebatC && isValidNumber(ebatC) ? String(ebatC) : null,
          quantity: adet && isValidNumber(adet) ? String(adet) : '1',
          total_qty: toplamMiktar && isValidNumber(toplamMiktar) ? String(toplamMiktar) : (adet && isValidNumber(adet) ? String(adet) : '1'),
          qty_uom: validateUOM(birim),
          unit_price_eur: String(parseFloat(String(birimFiyat))),
          total_price_eur: toplamFiyat && isValidNumber(toplamFiyat) ? String(parseFloat(String(toplamFiyat))) : String(parseFloat(String(birimFiyat))),
        });
      }
    }

    // Save cost items if any
    if (costItems.length > 0) {
      await storage.createVesproCostItems(costItems);
      console.log(`Created ${costItems.length} cost items for form ${vesproForm.form_id}`);
    }

    processed.push({
      form: vesproForm,
      createdForm: vesproForm, // Add explicit createdForm reference for auto-analysis triggers
      costItems: costItems.length,
      sheetName: sheetName || 'Unknown'
    });

  } catch (error) {
    console.error('Error processing Excel data:', error);
  }
  
  return processed;
}
*/
