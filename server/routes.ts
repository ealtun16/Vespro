import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertCostAnalysisSchema, insertTankSpecificationSchema, insertMaterialSchema, insertSettingsSchema } from "@shared/schema";
import multer from "multer";
import * as XLSX from "xlsx";
import { CostAnalysisEngine } from "./cost-analysis-engine";
import { AutoAnalysisTriggers } from "./auto-analysis-triggers";

interface MulterRequest extends Request {
  file?: Express.Multer.File;
}

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
        file.mimetype === 'application/vnd.ms-excel') {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files are allowed'));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
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
      
      // Auto-analysis trigger for manual tank creation
      let autoAnalysisResult = null;
      try {
        autoAnalysisResult = await AutoAnalysisTriggers.triggerManualCreationAnalysis(spec.id);
      } catch (error) {
        console.error('Error in manual creation auto-analysis trigger:', error);
      }
      
      res.status(201).json({
        ...spec,
        autoAnalysis: autoAnalysisResult
      });
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

  // Vespro Forms routes (for imported Excel data)
  app.get("/api/vespro-forms", async (req, res) => {
    try {
      const forms = await storage.getAllVesproForms();
      res.json(forms);
    } catch (error) {
      console.error("Error fetching vespro forms:", error);
      res.status(500).json({ message: "Failed to fetch imported forms" });
    }
  });

  // Download original Excel file
  app.get("/api/vespro-forms/:id/download", async (req, res) => {
    try {
      const { id } = req.params;
      const allForms = await storage.getAllVesproForms();
      const form = allForms.find(f => f.form_id === id);
      
      if (!form) {
        return res.status(404).json({ message: "Vespro form not found" });
      }
      
      if (!form.file_data || !form.original_filename) {
        return res.status(404).json({ message: "Original Excel file not found" });
      }
      
      // Decode base64 file data
      const fileBuffer = Buffer.from(form.file_data, 'base64');
      
      // Set proper headers for Excel file download
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `inline; filename="${form.original_filename}"`); // Use inline to view in browser
      res.setHeader('Content-Length', fileBuffer.length.toString());
      res.setHeader('Cache-Control', 'no-cache');
      
      // Send the file buffer
      res.end(fileBuffer);
      
    } catch (error) {
      console.error("Error downloading Excel file:", error);
      res.status(500).json({ message: "Failed to download Excel file" });
    }
  });

  // Get individual vespro form content for file viewing
  app.get("/api/vespro-forms/:id/content", async (req, res) => {
    try {
      const { id } = req.params;
      const allForms = await storage.getAllVesproForms();
      const form = allForms.find(f => f.form_id === id);
      
      if (!form) {
        return res.status(404).json({ message: "Vespro form not found" });
      }
      
      res.json(form);
    } catch (error) {
      console.error("Error fetching vespro form content:", error);
      res.status(500).json({ message: "Failed to fetch vespro form content" });
    }
  });

  app.get("/api/vespro-forms/:id", async (req, res) => {
    try {
      const form = await storage.getVesproForm(req.params.id);
      if (!form) {
        return res.status(404).json({ message: "Form not found" });
      }
      res.json(form);
    } catch (error) {
      console.error("Error fetching vespro form:", error);
      res.status(500).json({ message: "Failed to fetch form" });
    }
  });

  app.get("/api/vespro-forms/:id/cost-items", async (req, res) => {
    try {
      const costItems = await storage.getVesproFormCostItems(req.params.id);
      res.json(costItems);
    } catch (error) {
      console.error("Error fetching form cost items:", error);
      res.status(500).json({ message: "Failed to fetch cost items" });
    }
  });

  // Excel Import route
  app.post("/api/import/excel", upload.single('file'), async (req: MulterRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(sheet);

      // Process the Excel data with file storage
      const processed = await processExcelData(data, req.file.buffer, req.file.originalname);
      
      // Auto-analysis trigger for Excel imports
      let autoAnalysisResults: any[] = [];
      try {
        // Use the exact processed forms instead of relying on getAllVesproForms ordering
        if (processed && Array.isArray(processed) && processed.length > 0) {
          for (const processedItem of processed) {
            if (processedItem && processedItem.createdForm) {
              const result = await AutoAnalysisTriggers.triggerExcelImportAnalysis(processedItem.createdForm);
              autoAnalysisResults.push({
                formId: processedItem.createdForm.form_id,
                formCode: processedItem.createdForm.form_code,
                analysisResult: result
              });
            }
          }
        }
      } catch (error) {
        console.error('Error in auto-analysis trigger:', error);
      }
      
      res.json({ 
        message: "File imported successfully", 
        recordsProcessed: processed.length,
        autoAnalysisResults,
        autoAnalysisCount: autoAnalysisResults.filter(r => r.analysisResult.success).length
      });
    } catch (error) {
      console.error("Error importing Excel file:", error);
      res.status(500).json({ message: "Failed to import Excel file" });
    }
  });

  // Excel Export route
  app.get("/api/export/excel", async (req, res) => {
    try {
      const { analyses } = await storage.getAllCostAnalyses(1, 1000); // Get all for export
      
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

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Cost Analysis');

      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      res.setHeader('Content-Disposition', 'attachment; filename=cost-analysis-export.xlsx');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.send(buffer);
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

  const httpServer = createServer(app);
  return httpServer;
}

async function processExcelData(data: any[], fileBuffer?: Buffer, filename?: string): Promise<any[]> {
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
    const formCode = rawData[1]?.__EMPTY_2 || rawData[1]?.[2] || `IMP-${Date.now()}`;
    const tankName = rawData[1]?.__EMPTY_5 || rawData[1]?.[5] || 'Imported Tank';
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
          qty_uom: birim ? String(birim) : 'kg',
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
      costItems: costItems.length
    });

  } catch (error) {
    console.error('Error processing Excel data:', error);
  }
  
  return processed;
}
