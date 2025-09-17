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
  
  for (const row of data) {
    try {
      // Process data to vespro schema format
      if (row['Tank Type'] && row['Total Cost']) {
        // Create a vespro form for this import
        const vesproForm = await storage.createVesproForm({
          form_code: row['Report ID'] || `IMP-${Date.now()}`,
          client_name: row['Client'] || 'Imported Client',
          form_title: `${row['Tank Type']} - ${row['Tank Name'] || 'Imported Tank'}`,
          form_date: new Date().toISOString().split('T')[0],
          revision_no: 0,
          currency: 'EUR',
          notes: 'Imported from Excel',
          metadata: {
            originalRow: row,
            importDate: new Date().toISOString(),
          },
        });

        // Create cost items for the form
        const costItems = [];
        
        // Material cost item
        if (row['Material Cost'] && parseFloat(row['Material Cost']) > 0) {
          costItems.push({
            form_id: vesproForm.form_id,
            group_no: 1,
            seq_no: 1,
            cost_factor: 'Material Cost',
            material_quality: row['Material'] || 'Steel',
            quantity: '1',
            total_qty: '1',
            qty_uom: 'kg' as const,
            unit_price_eur: String(parseFloat(row['Material Cost'])),
            total_price_eur: String(parseFloat(row['Material Cost'])),
          });
        }

        // Labor cost item
        if (row['Labor Cost'] && parseFloat(row['Labor Cost']) > 0) {
          costItems.push({
            form_id: vesproForm.form_id,
            group_no: 2,
            seq_no: 1,
            cost_factor: 'Labor Cost',
            quantity: '1',
            total_qty: '1',
            qty_uom: 'other' as const,
            unit_price_eur: String(parseFloat(row['Labor Cost'])),
            total_price_eur: String(parseFloat(row['Labor Cost'])),
          });
        }

        // Overhead cost item
        if (row['Overhead Cost'] && parseFloat(row['Overhead Cost']) > 0) {
          costItems.push({
            form_id: vesproForm.form_id,
            group_no: 3,
            seq_no: 1,
            cost_factor: 'Overhead Cost',
            quantity: '1',
            total_qty: '1',
            qty_uom: 'other' as const,
            unit_price_eur: String(parseFloat(row['Overhead Cost'])),
            total_price_eur: String(parseFloat(row['Overhead Cost'])),
          });
        }

        if (costItems.length > 0) {
          await storage.createVesproCostItems(costItems);
        }

        processed.push(vesproForm);
      }
    } catch (error) {
      console.error('Error processing row:', row, error);
    }
  }
  
  return processed;
}
