import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertCostAnalysisSchema, insertTankSpecificationSchema, insertMaterialSchema, insertSettingsSchema, insertTurkishCostAnalysisSchema, insertTurkishCostItemSchema } from "@shared/schema";
import * as XLSX from "xlsx";
import { CostAnalysisEngine } from "./cost-analysis-engine";
import multer from "multer";
import path from "path";
import fs from "fs";
import { z } from "zod";
import { ExchangeRateService } from "./exchange-rate-service";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { sql } from "drizzle-orm";
import logger, { logExcelUpload, logApiError, logDbError } from "./logger";

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

// Agent API validation schemas
const agentChatSchema = z.object({
  sessionId: z.string().optional(),
  message: z.string().min(1).max(10000),
  context: z.any().optional()
});

const agentAnalyzeSchema = z.object({
  formData: z.any(), // Could be more specific based on tank spec schema
  preliminaryPrice: z.number().optional(),
  priceBreakdown: z.any().optional()
});

export async function registerRoutes(app: Express): Promise<Server> {
  // ========================================
  // TANK FORMS API (New Excel Viewer)
  // ========================================
  const { registerTankApi } = await import('./tank-api');
  registerTankApi(app);

  // ========================================
  // AUTHENTICATION ROUTES
  // ========================================
  
  // Register
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
      }
      
      if (password.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters' });
      }
      
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(409).json({ message: 'Username already exists' });
      }
      
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await storage.createUser({ username, password: hashedPassword });
      req.session.userId = user.id;
      
      res.status(201).json({ user: { id: user.id, username: user.username } });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ message: 'Registration failed' });
    }
  });
  
  // Login
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
      }
      
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ message: 'Invalid username or password' });
      }
      
      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        return res.status(401).json({ message: 'Invalid username or password' });
      }
      
      req.session.userId = user.id;
      res.json({ user: { id: user.id, username: user.username } });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Login failed' });
    }
  });
  
  // Get current user
  app.get('/api/auth/me', async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: 'Not authenticated' });
      }
      
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      res.json({ id: user.id, username: user.username });
    } catch (error) {
      console.error('Get current user error:', error);
      res.status(500).json({ message: 'Failed to get user' });
    }
  });
  
  // Logout
  app.post('/api/auth/logout', async (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error('Logout error:', err);
        return res.status(500).json({ message: 'Logout failed' });
      }
      res.json({ message: 'Logged out successfully' });
    });
  });

  // Serve uploaded files - use express.static for secure file serving
  app.use('/uploads', express.static(uploadsDir, { 
    index: false,
    dotfiles: 'deny'
  }));

  // Download route for specific files
  app.get("/download/:filename", (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(uploadsDir, filename);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ 
        message: "Dosya bulunamadı. Lütfen dosya adını kontrol edin." 
      });
    }
    
    // Send the file
    res.download(filePath, filename, (err) => {
      if (err) {
        console.error('Download error:', err);
        res.status(500).json({ 
          message: "Dosya indirilemedi. Lütfen tekrar deneyin." 
        });
      }
    });
  });

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

  // ========================================
  // EXCHANGE RATE ENDPOINTS
  // ========================================
  
  // Fetch latest exchange rates from external API
  app.get('/api/exchange-rates/latest', async (req, res) => {
    try {
      const rates = await ExchangeRateService.fetchLatestRates();
      const eurToUsdRate = ExchangeRateService.calculateEurToUsd(rates.usdToEur);
      
      res.json({
        success: true,
        rates: {
          usdToEur: rates.usdToEur,
          eurToUsd: eurToUsdRate,
          usdToTry: rates.usdToTry,
        },
        lastUpdated: rates.lastUpdated,
        source: 'European Central Bank (via Frankfurter API)'
      });
    } catch (error) {
      console.error('Error fetching exchange rates:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch exchange rates from external source' });
    }
  });

  // Update settings with latest exchange rates
  app.post('/api/exchange-rates/update-settings', async (req, res) => {
    try {
      const settings = await storage.getGlobalSettings();
      if (!settings) {
        return res.status(404).json({ success: false, error: 'Settings not found. Please create settings first.' });
      }

      const rates = await ExchangeRateService.fetchLatestRates();
      const eurToUsdRate = ExchangeRateService.calculateEurToUsd(rates.usdToEur);
      
      if (!ExchangeRateService.isValidRate(rates.usdToEur) || !ExchangeRateService.isValidRate(rates.usdToTry)) {
        return res.status(500).json({ success: false, error: 'Received invalid exchange rates from external API' });
      }

      const updatedSettings = await storage.updateSettings(settings.id, {
        eurToUsdRate: eurToUsdRate.toFixed(4),
        usdToTryRate: rates.usdToTry.toFixed(4),
        lastRateUpdate: new Date()
      } as any);

      res.json({
        success: true,
        message: 'Exchange rates updated successfully',
        rates: { eurToUsd: eurToUsdRate, usdToTry: rates.usdToTry },
        lastUpdated: rates.lastUpdated,
        settings: updatedSettings
      });
    } catch (error) {
      console.error('Error updating exchange rates in settings:', error);
      res.status(500).json({ success: false, error: 'Failed to update exchange rates in settings' });
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

  // ========================================
  // N8N AGENT INTEGRATION ROUTES
  // ========================================
  
  // Chat with agent endpoint
  app.post('/api/agent/chat', async (req, res) => {
    try {
      // Validate input
      const validationResult = agentChatSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: 'Invalid request data',
          details: validationResult.error.issues
        });
      }

      const { sessionId, message, context } = validationResult.data;

      // Get settings with API key (server-only)
      const settings = await storage.getSettingsWithApiKey();
      if (!settings || !settings.n8nEndpoint) {
        return res.status(400).json({ 
          error: 'Agent not configured. Please configure agent endpoints in Settings.' 
        });
      }

      // Initialize agent with settings
      const { createAgent } = await import('./agent');
      const agent = createAgent({
        chatEndpoint: settings.n8nEndpoint,
        analyzeEndpoint: settings.n8nEndpoint,
        apiKey: settings.n8nApiKey || undefined,
        apiKeyHeader: 'X-N8N-API-KEY'
      });

      // Call agent
      const response = await agent.chat({
        sessionId,
        message,
        context
      });

      if (!response.success) {
        // Sanitized error response - don't expose upstream details
        console.error('[API] Agent chat failed:', response.error);
        return res.status(502).json({ 
          error: 'Agent communication failed. Please try again.' 
        });
      }

      res.json({
        success: true,
        reply: response.data,
        agentRunId: response.agentRunId,
        tokens: response.tokens
      });

    } catch (error: any) {
      console.error('[API] Agent chat error:', error);
      res.status(500).json({ error: 'Failed to process chat request' });
    }
  });

  // Analyze tank specs with agent endpoint
  app.post('/api/agent/analyze', async (req, res) => {
    try {
      // Validate input
      const validationResult = agentAnalyzeSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: 'Invalid request data',
          details: validationResult.error.issues
        });
      }

      const { formData, preliminaryPrice, priceBreakdown } = validationResult.data;

      // Get settings with API key (server-only)
      const settings = await storage.getSettingsWithApiKey();
      if (!settings || !settings.n8nEndpoint) {
        return res.status(400).json({ 
          error: 'Agent not configured. Please configure agent endpoints in Settings.' 
        });
      }

      // Initialize agent with settings
      const { createAgent } = await import('./agent');
      const agent = createAgent({
        chatEndpoint: settings.n8nEndpoint,
        analyzeEndpoint: settings.n8nEndpoint,
        apiKey: settings.n8nApiKey || undefined,
        apiKeyHeader: 'X-N8N-API-KEY'
      });

      // Call agent for analysis
      const response = await agent.analyze({
        formData,
        preliminaryPrice,
        priceBreakdown
      });

      if (!response.success) {
        // Sanitized error response - don't expose upstream details
        console.error('[API] Agent analyze failed:', response.error);
        return res.status(502).json({ 
          error: 'Agent analysis failed. Please try again.' 
        });
      }

      res.json({
        success: true,
        analysis: response.data,
        agentRunId: response.agentRunId,
        tokens: response.tokens
      });

    } catch (error: any) {
      console.error('[API] Agent analyze error:', error);
      res.status(500).json({ error: 'Failed to process analysis request' });
    }
  });

  // Preliminary price estimate endpoint (wrapper around existing calculate)
  app.post('/api/analysis/estimate', async (req, res) => {
    try {
      const tankSpecData = insertTankSpecificationSchema.parse(req.body);
      
      // Get global settings for cost parameters
      const globalSettings = await storage.getGlobalSettings();
      if (!globalSettings) {
        return res.status(400).json({ 
          error: 'Global settings not configured. Please configure cost parameters in Settings.' 
        });
      }

      // Calculate costs using the engine
      const costBreakdown = await CostAnalysisEngine.calculateCosts({
        tankSpec: tankSpecData,
        settings: globalSettings
      });

      res.json({
        success: true,
        estimatedPrice: costBreakdown.totalCost,
        breakdown: costBreakdown
      });
      
    } catch (error: any) {
      console.error('Estimate calculation error:', error);
      if (error?.name === 'ZodError') {
        res.status(400).json({ 
          error: 'Invalid tank specification data', 
          details: error.issues 
        });
      } else {
        res.status(500).json({ error: 'Failed to calculate estimate' });
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
  // EXCEL UPLOAD ROUTE (NEW SYSTEM - uses tank table)
  // ========================================
  
  // Helper: Extract number from text (e.g., "0 BAR" -> 0, "2250 mm" -> 2250)
  function extractNumber(val: any): number | null {
    if (val === null || val === undefined || val === '') return null;
    if (typeof val === 'number') return val;
    const str = String(val).replace(/,/g, '.');
    const match = str.match(/-?\d+\.?\d*/);
    return match ? parseFloat(match[0]) : null;
  }

  // Helper: Get cell value safely
  function getCellValue(sheet: XLSX.WorkSheet, cell: string): any {
    const cellObj = sheet[cell];
    return cellObj ? cellObj.v : null;
  }
  
  app.post("/api/excel/upload", upload.single('file'), async (req, res) => {
    const startTime = Date.now();
    
    try {
      if (!req.file) {
        logExcelUpload.error('unknown', new Error('No file uploaded'));
        return res.status(400).json({ message: "No file uploaded" });
      }

      const excelFileName = req.file.filename;
      const fileSize = req.file.size;
      
      // Log upload start
      logExcelUpload.start(excelFileName, fileSize);
      logger.info('Excel file received', {
        filename: excelFileName,
        size: fileSize,
        mimetype: req.file.mimetype,
        path: req.file.path
      });

      // Read Excel file
      const workbook = XLSX.readFile(req.file.path);
      const sheetName = workbook.SheetNames[0]; // İlk sayfa
      const sheet = workbook.Sheets[sheetName];
      
      logExcelUpload.sheetProcessing(sheetName, 'detecting...');
      
      try {
        // Tank kodu kontrolü
        const tankKodu = getCellValue(sheet, 'D2');
        if (!tankKodu) {
          logExcelUpload.cellReadError(excelFileName, 'D2', 'Tank kodu bulunamadı');
          throw new Error('Tank kodu (D2) bulunamadı!');
        }
        
        logExcelUpload.sheetProcessing(sheetName, String(tankKodu));
        
        // Parse tarih
        const parseDate = (val: any): string | null => {
          if (!val) return null;
          if (typeof val === 'number') {
            const excelEpoch = new Date(Date.UTC(1899, 11, 30));
            const date = new Date(excelEpoch.getTime() + val * 86400000);
            if (!isNaN(date.getTime())) {
              return date.toISOString().split('T')[0];
            }
          }
          if (val instanceof Date) {
            return val.toISOString().split('T')[0];
          }
          if (typeof val === 'string') {
            const date = new Date(val);
            if (!isNaN(date.getTime())) {
              return date.toISOString().split('T')[0];
            }
          }
          return null;
        };
        
        // Tank data
        const tankData = {
          tank_kodu: String(tankKodu),
          fiyat_tarihi: parseDate(getCellValue(sheet, 'N2')),
          yalitim_kod: getCellValue(sheet, 'E2'),
          yalitim_aciklama: getCellValue(sheet, 'E3'),
          yalitim_malzeme: getCellValue(sheet, 'D3'),
          karistirici_kod: getCellValue(sheet, 'F2'),
          karistirici_aciklama: getCellValue(sheet, 'F3'),
          ceket_kod: getCellValue(sheet, 'G2'),
          ceket_aciklama: getCellValue(sheet, 'G3'),
          cap_mm: extractNumber(getCellValue(sheet, 'I2')),
          silindir_boyu_mm: extractNumber(getCellValue(sheet, 'K2')),
          cevre_ara_hesap: extractNumber(getCellValue(sheet, 'M2')),
          hacim_m3: extractNumber(getCellValue(sheet, 'H3')),
          urun_kalitesi: getCellValue(sheet, 'I3'),
          basinc_bar: extractNumber(getCellValue(sheet, 'K3')),
          toplam_agirlik_kg: extractNumber(getCellValue(sheet, 'P3')),
          satis_fiyati_eur: extractNumber(getCellValue(sheet, 'P2')),
          sicaklik_c: extractNumber(getCellValue(sheet, 'Q3')),
          ortam_c: extractNumber(getCellValue(sheet, 'R3')),
          revizyon_no: extractNumber(getCellValue(sheet, 'O3')),
          ozet_etiketi: getCellValue(sheet, 'M3'),
        };
        
        console.log(`[Excel Upload] Tank: ${tankData.tank_kodu}, Date: ${tankData.fiyat_tarihi}`);
        
        // UPSERT tank
        const tankResult = await db.execute(sql`
          INSERT INTO tank (
            tank_kodu, fiyat_tarihi, yalitim_kod, yalitim_aciklama, yalitim_malzeme,
            karistirici_kod, karistirici_aciklama, ceket_kod, ceket_aciklama,
            cap_mm, silindir_boyu_mm, cevre_ara_hesap, hacim_m3, urun_kalitesi,
            basinc_bar, toplam_agirlik_kg, satis_fiyati_eur, sicaklik_c,
            ortam_c, revizyon_no, ozet_etiketi, excel_file_path
          ) VALUES (
            ${tankData.tank_kodu}, ${tankData.fiyat_tarihi}, ${tankData.yalitim_kod},
            ${tankData.yalitim_aciklama}, ${tankData.yalitim_malzeme}, ${tankData.karistirici_kod},
            ${tankData.karistirici_aciklama}, ${tankData.ceket_kod}, ${tankData.ceket_aciklama},
            ${tankData.cap_mm}, ${tankData.silindir_boyu_mm}, ${tankData.cevre_ara_hesap},
            ${tankData.hacim_m3}, ${tankData.urun_kalitesi}, ${tankData.basinc_bar},
            ${tankData.toplam_agirlik_kg}, ${tankData.satis_fiyati_eur}, ${tankData.sicaklik_c},
            ${tankData.ortam_c}, ${tankData.revizyon_no}, ${tankData.ozet_etiketi}, ${excelFileName}
          )
          ON CONFLICT (tank_kodu, fiyat_tarihi) 
          DO UPDATE SET
            cap_mm = EXCLUDED.cap_mm,
            silindir_boyu_mm = EXCLUDED.silindir_boyu_mm,
            hacim_m3 = EXCLUDED.hacim_m3,
            satis_fiyati_eur = EXCLUDED.satis_fiyati_eur,
            toplam_agirlik_kg = EXCLUDED.toplam_agirlik_kg,
            excel_file_path = EXCLUDED.excel_file_path,
            updated_at = NOW()
          RETURNING id;
        `);
        
        const tankId = tankResult.rows[0].id;
        logExcelUpload.tankCreated(String(tankId), tankData.tank_kodu);
        
        // Delete old items for clean reimport
        await db.execute(sql`DELETE FROM tank_kalem WHERE tank_id = ${tankId}`);
        
        // Import items (rows 8-162)
        let kalemCount = 0;
        for (let row = 8; row <= 162; row++) {
          const grupNo = getCellValue(sheet, `B${row}`);
          const siraNo = getCellValue(sheet, `C${row}`);
          const malyetFaktoru = getCellValue(sheet, `D${row}`);
          
          if (!grupNo && !siraNo && !malyetFaktoru) continue;
          
          await db.execute(sql`
            INSERT INTO tank_kalem (
              tank_id, grup_no, sira_no, maliyet_faktoru, malzeme_kalitesi, malzeme_tipi,
              malzemenin_durumu, ebat_1_mm, ebat_2_mm, ebat_3, ebat_4, adet, toplam_miktar,
              birim, birim_fiyat_eur, toplam_fiyat_eur, kategori_atolye_iscilik,
              kategori_dis_tedarik, kategori_atolye_iscilik_2
            ) VALUES (
              ${tankId}, ${grupNo}, ${siraNo}, ${malyetFaktoru},
              ${getCellValue(sheet, `E${row}`)}, ${getCellValue(sheet, `F${row}`)},
              ${getCellValue(sheet, `P${row}`)}, ${extractNumber(getCellValue(sheet, `G${row}`))},
              ${extractNumber(getCellValue(sheet, `H${row}`))}, ${extractNumber(getCellValue(sheet, `I${row}`))},
              ${extractNumber(getCellValue(sheet, `J${row}`))}, ${extractNumber(getCellValue(sheet, `K${row}`))},
              ${extractNumber(getCellValue(sheet, `L${row}`))}, ${getCellValue(sheet, `M${row}`)},
              ${extractNumber(getCellValue(sheet, `N${row}`))}, ${extractNumber(getCellValue(sheet, `O${row}`))},
              ${getCellValue(sheet, `Q${row}`) ? 1 : 0}, ${getCellValue(sheet, `R${row}`) ? 1 : 0},
              ${getCellValue(sheet, `T${row}`) ? 1 : 0}
            )
          `);
          kalemCount++;
        }
        
        logExcelUpload.itemsImported(kalemCount, String(tankId));
        
        // Refresh view to include new tank
        await db.execute(sql`REFRESH MATERIALIZED VIEW IF EXISTS orders_list_view`);
        
        // Calculate duration
        const duration = Date.now() - startTime;
        logExcelUpload.success(excelFileName, String(tankId), duration);
        
        res.json({
          success: true,
          message: 'Excel dosyası başarıyla yüklendi',
          tankOrderId: String(tankId),
          results: {
            totalSheets: 1,
            successfulSheets: 1,
            failedSheets: 0,
            tankOrderIds: [String(tankId)]
          }
        });
        
      } catch (sheetError) {
        const error = sheetError instanceof Error ? sheetError : new Error(String(sheetError));
        logExcelUpload.error(excelFileName, error, {
          sheetName,
          tankData: error.message.includes('Tank kodu') ? { cell: 'D2', issue: 'missing tank code' } : undefined
        });
        
        res.status(500).json({
          success: false,
          message: 'Excel dosyası işlenemedi',
          error: error.message,
          results: {
            totalSheets: 1,
            successfulSheets: 0,
            failedSheets: 1,
            tankOrderIds: []
          }
        });
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logExcelUpload.error(req.file?.filename || 'unknown', err, {
        stage: 'file_processing',
        fileSize: req.file?.size,
        mimetype: req.file?.mimetype
      });
      
      res.status(500).json({
        message: 'Excel dosyası yüklenemedi',
        error: err.message
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
