/**
 * Automatic Cost Analysis Triggers
 * Handles automatic cost analysis after Excel import and manual tank creation
 */

import { storage } from "./storage";
import { CostAnalysisEngine } from "./cost-analysis-engine";
import type { InsertTankSpecification, VesproForm, Settings } from "@shared/schema";

export interface AutoAnalysisResult {
  success: boolean;
  analysisId?: string;
  error?: string;
  triggerType: 'excel_import' | 'manual_creation';
}

/**
 * Automatic Analysis Trigger System
 */
export class AutoAnalysisTriggers {
  
  /**
   * Check if auto-analysis is enabled in settings
   */
  static async isAutoAnalysisEnabled(): Promise<boolean> {
    try {
      const globalSettings = await storage.getGlobalSettings();
      return globalSettings?.autoAnalysisEnabled === true;
    } catch (error) {
      console.error('Error checking auto-analysis settings:', error);
      return false; // Default to disabled if error
    }
  }

  /**
   * Trigger automatic cost analysis for Excel import
   * Converts vespro form data to tank specification and runs analysis
   */
  static async triggerExcelImportAnalysis(vesproForm: VesproForm): Promise<AutoAnalysisResult> {
    try {
      // Check if auto-analysis is enabled
      const isEnabled = await this.isAutoAnalysisEnabled();
      if (!isEnabled) {
        return {
          success: false,
          error: 'Auto-analysis is disabled in settings',
          triggerType: 'excel_import'
        };
      }

      // Convert vespro form to tank specification format
      const tankSpecData = this.convertVesproFormToTankSpec(vesproForm);
      
      // Create tank specification first for proper linkage
      const createdTankSpec = await storage.createTankSpecification(tankSpecData);
      
      // Get global settings for cost parameters
      const globalSettings = await storage.getGlobalSettings();
      if (!globalSettings) {
        return {
          success: false,
          error: 'Global settings not configured',
          triggerType: 'excel_import'
        };
      }

      // Run cost analysis using AI engine with created tank spec
      const costBreakdown = await CostAnalysisEngine.calculateCosts({
        tankSpec: { ...tankSpecData, id: createdTankSpec.id },
        settings: globalSettings
      });

      // Generate cost analysis record
      const autoCostAnalysis = CostAnalysisEngine.generateAutoCostAnalysis(
        { ...tankSpecData, id: createdTankSpec.id }, 
        costBreakdown
      );

      // Link to tank specification and add reference to vespro form
      autoCostAnalysis.tankSpecificationId = createdTankSpec.id;
      autoCostAnalysis.notes = `${autoCostAnalysis.notes} | Excel Import: ${vesproForm.form_code}`;

      // Save analysis to database
      const savedAnalysis = await storage.createAutoCostAnalysis(autoCostAnalysis);

      console.log(`Auto-analysis completed for Excel import: ${vesproForm.form_code} -> Analysis: ${savedAnalysis.reportId}`);

      return {
        success: true,
        analysisId: savedAnalysis.id,
        triggerType: 'excel_import'
      };

    } catch (error: any) {
      console.error('Error in Excel import auto-analysis:', error);
      return {
        success: false,
        error: error?.message || 'Unknown error',
        triggerType: 'excel_import'
      };
    }
  }

  /**
   * Trigger automatic cost analysis for manual tank creation
   */
  static async triggerManualCreationAnalysis(tankId: string): Promise<AutoAnalysisResult> {
    try {
      // Check if auto-analysis is enabled
      const isEnabled = await this.isAutoAnalysisEnabled();
      if (!isEnabled) {
        return {
          success: false,
          error: 'Auto-analysis is disabled in settings',
          triggerType: 'manual_creation'
        };
      }

      // Get tank specification
      const tankSpec = await storage.getTankSpecification(tankId);
      if (!tankSpec) {
        return {
          success: false,
          error: 'Tank specification not found',
          triggerType: 'manual_creation'
        };
      }

      // Get global settings
      const globalSettings = await storage.getGlobalSettings();
      if (!globalSettings) {
        return {
          success: false,
          error: 'Global settings not configured',
          triggerType: 'manual_creation'
        };
      }

      // Convert tankSpec features for type safety  
      const safeTankSpec = {
        ...tankSpec,
        features: tankSpec.features as any
      };
      
      // Run cost analysis
      const costBreakdown = await CostAnalysisEngine.calculateCosts({
        tankSpec: safeTankSpec,
        settings: globalSettings
      });

      // Generate cost analysis record
      const autoCostAnalysis = CostAnalysisEngine.generateAutoCostAnalysis(
        safeTankSpec, 
        costBreakdown
      );

      // Link to tank specification
      autoCostAnalysis.tankSpecificationId = tankId;
      autoCostAnalysis.notes = `${autoCostAnalysis.notes} | Manual Creation: ${tankSpec.name}`;

      // Save analysis
      const savedAnalysis = await storage.createAutoCostAnalysis(autoCostAnalysis);

      console.log(`Auto-analysis completed for manual creation: ${tankSpec.name} -> Analysis: ${savedAnalysis.reportId}`);

      return {
        success: true,
        analysisId: savedAnalysis.id,
        triggerType: 'manual_creation'
      };

    } catch (error: any) {
      console.error('Error in manual creation auto-analysis:', error);
      return {
        success: false,
        error: error?.message || 'Unknown error',
        triggerType: 'manual_creation'
      };
    }
  }

  /**
   * Convert vespro form data to tank specification format
   */
  private static convertVesproFormToTankSpec(vesproForm: VesproForm): InsertTankSpecification {
    return {
      name: vesproForm.tank_name || `Imported Tank ${vesproForm.form_code}`,
      type: vesproForm.tank_type || "Storage Tank",
      capacity: Number(vesproForm.tank_volume) || 1000,
      height: Number(vesproForm.tank_height_mm) || 2000,
      diameter: Number(vesproForm.tank_diameter_mm) || 1000,
      width: vesproForm.tank_width_mm ? Number(vesproForm.tank_width_mm) : undefined,
      pressure: this.extractPressureValue(vesproForm.operating_pressure),
      pressure_text: vesproForm.operating_pressure || undefined,
      temperature: this.extractTemperatureValue(vesproForm.operating_temperature),
      temperature_text: vesproForm.operating_temperature || undefined,
      material: this.extractMaterialType(vesproForm.tank_material_type, vesproForm.tank_material_grade),
      material_type: vesproForm.tank_material_type || undefined,
      material_grade: vesproForm.tank_material_grade || undefined,
      thickness: "6", // Default thickness in mm as string
      volume_calculated: vesproForm.tank_volume ? Number(vesproForm.tank_volume) : undefined,
      surface_area: vesproForm.tank_surface_area ? Number(vesproForm.tank_surface_area) : undefined,
      drawing_reference: vesproForm.form_code,
      features: {
        importSource: 'excel',
        formId: vesproForm.form_id,
        currency: vesproForm.currency,
        projectStatus: vesproForm.project_status
      }
    };
  }

  /**
   * Extract numeric temperature value from text (e.g., "20°C" -> 20)
   */
  private static extractTemperatureValue(temperatureText?: string): string {
    if (!temperatureText) return "20";
    
    // Extract numbers from temperature text
    const match = temperatureText.match(/-?\d+(\.\d+)?/);
    return match ? match[0] : "20";
  }

  /**
   * Extract numeric pressure value from text (e.g., "10 BAR" -> "10")
   */
  private static extractPressureValue(pressureText?: string): string {
    if (!pressureText) return "0";
    
    // Extract numbers from pressure text
    const match = pressureText.match(/\d+(\.\d+)?/);
    return match ? match[0] : "0";
  }

  /**
   * Extract material type from material fields
   */
  private static extractMaterialType(materialType?: string, materialGrade?: string): string {
    if (materialGrade) {
      if (materialGrade.toLowerCase().includes('duplex')) {
        return 'Duplex Steel';
      } else if (materialGrade.toLowerCase().includes('316')) {
        return '316 Stainless Steel';
      } else if (materialGrade.toLowerCase().includes('304')) {
        return '304 Stainless Steel';
      }
    }
    
    if (materialType) {
      return materialType;
    }
    
    return 'Carbon Steel'; // Default
  }

  /**
   * Batch process multiple vespro forms for auto-analysis
   */
  static async batchProcessExcelImports(vesproForms: VesproForm[]): Promise<AutoAnalysisResult[]> {
    const results: AutoAnalysisResult[] = [];
    
    for (const form of vesproForms) {
      const result = await this.triggerExcelImportAnalysis(form);
      results.push(result);
      
      // Small delay to prevent overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return results;
  }

  /**
   * Get auto-analysis statistics
   */
  static async getAutoAnalysisStats(): Promise<{
    totalAutoAnalyses: number;
    excelImportAnalyses: number;
    manualCreationAnalyses: number;
    successRate: number;
  }> {
    try {
      // This would require additional database queries to track auto-analysis metadata
      // For now, return basic stats from cost analyses with "AUTO-" prefix
      const allAnalyses = await storage.getAllCostAnalyses(1, 1000);
      const autoAnalyses = allAnalyses.analyses.filter((analysis: any) => 
        analysis.reportId && analysis.reportId.startsWith('AUTO-')
      );
      
      const excelImportAnalyses = autoAnalyses.filter((analysis: any) =>
        analysis.notes && analysis.notes.includes('Excel Import:')
      );
      
      const manualCreationAnalyses = autoAnalyses.filter((analysis: any) =>
        analysis.notes && analysis.notes.includes('Manual Creation:')
      );
      
      return {
        totalAutoAnalyses: autoAnalyses.length,
        excelImportAnalyses: excelImportAnalyses.length,
        manualCreationAnalyses: manualCreationAnalyses.length,
        successRate: autoAnalyses.length > 0 ? 100 : 0 // Simplified - only successful ones are in DB
      };
      
    } catch (error) {
      console.error('Error getting auto-analysis stats:', error);
      return {
        totalAutoAnalyses: 0,
        excelImportAnalyses: 0,
        manualCreationAnalyses: 0,
        successRate: 0
      };
    }
  }
}