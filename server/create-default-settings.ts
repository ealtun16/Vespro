import { db } from "./db";
import { settings } from "@shared/schema";
import { eq } from "drizzle-orm";

async function createDefaultSettings() {
  try {
    console.log("Checking for existing global settings...");
    
    // Check if global settings already exist
    const existingSettings = await db
      .select()
      .from(settings)
      .where(eq(settings.settingsType, "global"))
      .limit(1);
    
    if (existingSettings.length > 0) {
      console.log("Global settings already exist:");
      console.log(JSON.stringify(existingSettings[0], null, 2));
      return;
    }
    
    console.log("Creating default global settings...");
    
    const defaultSettings = {
      settingsType: "global" as const,
      language: "tr",
      currency: "EUR",
      materialCostMultiplier: "1.15",
      laborCostMultiplier: "1.20",
      overheadCostMultiplier: "1.10",
      steelPricePerKg: "2.50",
      hourlyLaborRate: "25.00",
      overheadPercentage: "15.00",
      eurToUsdRate: "1.0850",
      usdToTryRate: "34.50",
      autoAnalysisEnabled: false,
      analysisConfidenceThreshold: "0.85",
    };
    
    const [newSettings] = await db
      .insert(settings)
      .values(defaultSettings)
      .returning();
    
    console.log("\n✓ Default global settings created successfully:");
    console.log(JSON.stringify(newSettings, null, 2));
    
  } catch (error) {
    console.error("Error creating default settings:", error);
    throw error;
  } finally {
    process.exit(0);
  }
}

createDefaultSettings();
