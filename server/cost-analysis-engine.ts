/**
 * AI Agent Rule-Based Cost Analysis Engine
 * Automatically calculates tank equipment costs based on specifications and rules
 */

import type { InsertCostAnalysis, InsertTankSpecification } from "@shared/schema";
import type { SafeSettings } from "./storage";

export interface CostCalculationInput {
  tankSpec: InsertTankSpecification;
  settings: SafeSettings;
  materialPrices?: MaterialPriceMap;
}

export interface MaterialPriceMap {
  [materialType: string]: {
    pricePerKg: number;
    densityKgM3: number;
  };
}

export interface CostBreakdown {
  materialCost: number;
  laborCost: number;
  overheadCost: number;
  totalCost: number;
  calculations: {
    surfaceAreaM2: number;
    volumeM3: number;
    materialWeightKg: number;
    complexityFactor: number;
    laborHours: number;
  };
}

/**
 * AI Agent Cost Analysis Engine
 * Rule-based automatic cost calculation for industrial tanks
 */
export class CostAnalysisEngine {
  
  /**
   * Calculate comprehensive cost analysis for a tank specification
   */
  static async calculateCosts(input: CostCalculationInput): Promise<CostBreakdown> {
    const { tankSpec, settings } = input;
    
    // Step 1: Calculate geometric properties
    const geometry = this.calculateGeometry(tankSpec);
    
    // Step 2: Determine complexity factor based on tank type and features
    const complexityFactor = this.calculateComplexityFactor(tankSpec);
    
    // Step 3: Calculate material costs
    const materialCost = this.calculateMaterialCost(tankSpec, geometry, settings);
    
    // Step 4: Calculate labor costs
    const laborCost = this.calculateLaborCost(geometry, complexityFactor, settings);
    
    // Step 5: Calculate overhead costs
    const overheadCost = this.calculateOverheadCost(materialCost, laborCost, settings);
    
    const totalCost = materialCost + laborCost + overheadCost;
    
    return {
      materialCost,
      laborCost,
      overheadCost,
      totalCost,
      calculations: {
        surfaceAreaM2: geometry.surfaceAreaM2,
        volumeM3: geometry.volumeM3,
        materialWeightKg: geometry.materialWeightKg,
        complexityFactor,
        laborHours: geometry.surfaceAreaM2 * complexityFactor * 0.8, // Base: 0.8 hours per m2
      }
    };
  }

  /**
   * Calculate tank geometry properties
   */
  private static calculateGeometry(tankSpec: InsertTankSpecification) {
    const heightM = (tankSpec.height || 0) / 1000; // mm to m
    const diameterM = (tankSpec.diameter || 0) / 1000; // mm to m
    const widthM = (tankSpec.width || 0) / 1000; // mm to m
    const thicknessM = (Number(tankSpec.thickness) || 6) / 1000; // mm to m, default 6mm
    
    let surfaceAreaM2 = 0;
    let volumeM3 = 0;
    
    // Calculate based on tank type
    if (tankSpec.type === "Storage Tank" || tankSpec.type === "Pressure Vessel") {
      // Cylindrical tank
      const radius = diameterM / 2;
      
      // Surface area: circumference * height + 2 * circular ends
      surfaceAreaM2 = (2 * Math.PI * radius * heightM) + (2 * Math.PI * radius * radius);
      
      // Volume
      volumeM3 = Math.PI * radius * radius * heightM;
      
    } else if (tankSpec.type === "Heat Exchanger") {
      // More complex geometry with internal components
      const radius = diameterM / 2;
      surfaceAreaM2 = (2 * Math.PI * radius * heightM) + (2 * Math.PI * radius * radius);
      surfaceAreaM2 *= 1.3; // 30% increase for internal components
      volumeM3 = Math.PI * radius * radius * heightM;
      
    } else {
      // Rectangular/custom tank
      if (widthM > 0) {
        surfaceAreaM2 = 2 * (heightM * widthM + heightM * diameterM + widthM * diameterM);
        volumeM3 = heightM * widthM * diameterM;
      } else {
        // Fallback to cylindrical
        const radius = diameterM / 2;
        surfaceAreaM2 = (2 * Math.PI * radius * heightM) + (2 * Math.PI * radius * radius);
        volumeM3 = Math.PI * radius * radius * heightM;
      }
    }
    
    // Calculate material weight (kg)
    // Steel density ~7850 kg/m³, surface area * thickness = volume of steel
    const steelDensity = 7850; // kg/m³
    const materialVolumeM3 = surfaceAreaM2 * thicknessM;
    const materialWeightKg = materialVolumeM3 * steelDensity;
    
    return {
      surfaceAreaM2: Math.round(surfaceAreaM2 * 100) / 100,
      volumeM3: Math.round(volumeM3 * 100) / 100,
      materialWeightKg: Math.round(materialWeightKg),
      thicknessM,
    };
  }

  /**
   * Calculate complexity factor based on tank specifications
   */
  private static calculateComplexityFactor(tankSpec: InsertTankSpecification): number {
    let factor = 1.0; // Base complexity
    
    // Tank type complexity
    switch (tankSpec.type) {
      case "Storage Tank":
        factor *= 1.0; // Base complexity
        break;
      case "Pressure Vessel":
        factor *= 1.4; // Higher complexity due to pressure requirements
        break;
      case "Heat Exchanger":
        factor *= 1.8; // Highest complexity - internal components
        break;
      default:
        factor *= 1.2; // Unknown type - moderate complexity
    }
    
    // Pressure complexity
    const pressure = Number(tankSpec.pressure) || 0;
    if (pressure > 10) {
      factor *= 1.3; // High pressure increases complexity
    } else if (pressure > 0) {
      factor *= 1.1; // Any pressure increases complexity
    }
    
    // Temperature complexity
    const temperature = Number(tankSpec.temperature) || 20;
    if (Math.abs(temperature - 20) > 100) {
      factor *= 1.2; // Extreme temperatures
    } else if (Math.abs(temperature - 20) > 50) {
      factor *= 1.1; // Moderate temperature difference
    }
    
    // Material complexity (special alloys)
    if (tankSpec.material_grade && 
        (tankSpec.material_grade.includes("duplex") || 
         tankSpec.material_grade.includes("super") ||
         tankSpec.material_grade.includes("316"))) {
      factor *= 1.3; // Special alloys are more complex to work with
    }
    
    // Size complexity
    const capacity = tankSpec.capacity || 0;
    if (capacity > 50000) {
      factor *= 1.4; // Very large tanks
    } else if (capacity > 10000) {
      factor *= 1.2; // Large tanks
    }
    
    return Math.round(factor * 100) / 100;
  }

  /**
   * Calculate material costs based on tank specifications
   */
  private static calculateMaterialCost(
    tankSpec: InsertTankSpecification, 
    geometry: any, 
    settings: SafeSettings
  ): number {
    // Base steel price per kg from settings
    const steelPricePerKg = Number(settings.steelPricePerKg) || 2.5; // Default €2.5/kg
    
    // Material grade multiplier
    let materialMultiplier = 1.0;
    if (tankSpec.material_grade) {
      const grade = tankSpec.material_grade.toLowerCase();
      if (grade.includes("super duplex")) {
        materialMultiplier = 4.5; // Super duplex is very expensive
      } else if (grade.includes("duplex")) {
        materialMultiplier = 3.2; // Duplex steel
      } else if (grade.includes("316")) {
        materialMultiplier = 2.8; // 316 stainless steel
      } else if (grade.includes("304")) {
        materialMultiplier = 2.2; // 304 stainless steel
      } else if (grade.includes("carbon")) {
        materialMultiplier = 1.0; // Carbon steel baseline
      }
    }
    
    // Calculate base material cost
    const baseMaterialCost = geometry.materialWeightKg * steelPricePerKg * materialMultiplier;
    
    // Apply settings multiplier
    const settingsMultiplier = Number(settings.materialCostMultiplier) || 1.0;
    
    // Add additional components (nozzles, flanges, etc.) - ~15-25% of base cost
    const additionalComponents = baseMaterialCost * 0.20;
    
    const totalMaterialCost = (baseMaterialCost + additionalComponents) * settingsMultiplier;
    
    return Math.round(totalMaterialCost * 100) / 100;
  }

  /**
   * Calculate labor costs based on complexity and settings
   */
  private static calculateLaborCost(
    geometry: any, 
    complexityFactor: number, 
    settings: SafeSettings
  ): number {
    // Base labor calculation: surface area * complexity * hours per m²
    const baseHoursPerM2 = 0.8; // Base hours per square meter
    const laborHours = geometry.surfaceAreaM2 * complexityFactor * baseHoursPerM2;
    
    // Hourly rate from settings
    const hourlyRate = Number(settings.hourlyLaborRate) || 45; // Default €45/hour
    
    // Calculate base labor cost
    const baseLaborCost = laborHours * hourlyRate;
    
    // Apply settings multiplier
    const settingsMultiplier = Number(settings.laborCostMultiplier) || 1.0;
    
    const totalLaborCost = baseLaborCost * settingsMultiplier;
    
    return Math.round(totalLaborCost * 100) / 100;
  }

  /**
   * Calculate overhead costs based on project size and settings
   */
  private static calculateOverheadCost(
    materialCost: number, 
    laborCost: number, 
    settings: SafeSettings
  ): number {
    const directCosts = materialCost + laborCost;
    
    // Overhead percentage from settings
    const overheadPercentage = Number(settings.overheadPercentage) || 15; // Default 15%
    
    // Calculate base overhead
    const baseOverhead = directCosts * (overheadPercentage / 100);
    
    // Apply settings multiplier
    const settingsMultiplier = Number(settings.overheadCostMultiplier) || 1.0;
    
    const totalOverhead = baseOverhead * settingsMultiplier;
    
    return Math.round(totalOverhead * 100) / 100;
  }

  /**
   * Generate automatic cost analysis report
   */
  static generateAutoCostAnalysis(
    tankSpec: InsertTankSpecification,
    breakdown: CostBreakdown
  ): InsertCostAnalysis {
    const reportId = `AUTO-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    
    return {
      reportId,
      tankSpecificationId: undefined, // Will be set when tank is saved
      materialCost: breakdown.materialCost.toFixed(2),
      laborCost: breakdown.laborCost.toFixed(2), 
      overheadCost: breakdown.overheadCost.toFixed(2),
      totalCost: breakdown.totalCost.toFixed(2),
      currency: "EUR", // Default to EUR for calculations
      notes: `Automatic AI analysis - Surface area: ${breakdown.calculations.surfaceAreaM2}m², ` +
             `Weight: ${breakdown.calculations.materialWeightKg}kg, ` +
             `Complexity: ${breakdown.calculations.complexityFactor}x, ` +
             `Labor hours: ${breakdown.calculations.laborHours.toFixed(1)}h`
    };
  }
}