import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertCostAnalysisSchema, insertTankSpecificationSchema, insertMaterialSchema } from "@shared/schema";
import multer from "multer";
import * as XLSX from "xlsx";

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

  app.get("/api/cost-analyses/:id", async (req, res) => {
    try {
      const analysis = await storage.getCostAnalysisWithDetails(req.params.id);
      if (!analysis) {
        return res.status(404).json({ message: "Cost analysis not found" });
      }
      res.json(analysis);
    } catch (error) {
      console.error("Error fetching cost analysis:", error);
      res.status(500).json({ message: "Failed to fetch cost analysis" });
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

      // Process the Excel data - this is a basic example
      // You would need to customize this based on your Excel file structure
      const processed = await processExcelData(data);
      
      res.json({ 
        message: "File imported successfully", 
        recordsProcessed: processed.length 
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

  const httpServer = createServer(app);
  return httpServer;
}

async function processExcelData(data: any[]): Promise<any[]> {
  const processed = [];
  
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
      tank_width_mm: tankWidth ? String(tankWidth) : null,
      tank_height_mm: tankHeight ? String(tankHeight) : null,
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

      // Only process rows with meaningful data
      if (maliyetFaktoru && birimFiyat && parseFloat(String(birimFiyat)) > 0) {
        costItems.push({
          form_id: vesproForm.form_id,
          group_no: grupNo ? parseInt(String(grupNo)) : 1,
          seq_no: siraNo ? parseInt(String(siraNo)) : costItems.length + 1,
          cost_factor: String(maliyetFaktoru),
          material_quality: malzemeKalitesi ? String(malzemeKalitesi) : null,
          material_type: malzemeTipi ? String(malzemeTipi) : null,
          dim_a_mm: ebatA ? String(ebatA) : null,
          dim_b_mm: ebatB ? String(ebatB) : null,
          dim_c_thickness_mm: ebatC ? String(ebatC) : null,
          quantity: adet ? String(adet) : '1',
          total_qty: toplamMiktar ? String(toplamMiktar) : String(adet || 1),
          qty_uom: birim ? String(birim) : 'kg',
          unit_price_eur: String(birimFiyat),
          total_price_eur: toplamFiyat ? String(toplamFiyat) : String(birimFiyat),
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
      costItems: costItems.length
    });

  } catch (error) {
    console.error('Error processing Excel data:', error);
  }
  
  return processed;
}
