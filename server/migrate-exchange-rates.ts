/**
 * Migration script to update exchange rate columns in settings table
 * Changes:
 * 1. Rename try_to_usd_rate to usd_to_try_rate
 * 2. Update default value to reflect USD/TRY format (inverse of old value)
 * 3. Add last_rate_update timestamp column
 */

import dotenv from "dotenv";
dotenv.config();

import { db } from "./db";
import { sql } from "drizzle-orm";

async function migrateExchangeRates() {
  console.log("Starting exchange rate migration...");

  try {
    // Check if old column exists
    const checkColumnQuery = sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'settings' 
      AND column_name = 'try_to_usd_rate'
    `;
    
    const columnExists = await db.execute(checkColumnQuery);
    
    if (columnExists.rows.length > 0) {
      console.log("Found old column 'try_to_usd_rate', migrating...");
      
      // Step 1: Add new column usd_to_try_rate
      await db.execute(sql`
        ALTER TABLE settings 
        ADD COLUMN IF NOT EXISTS usd_to_try_rate NUMERIC(8,4) DEFAULT 34.0000
      `);
      console.log("✓ Added new column 'usd_to_try_rate'");
      
      // Step 2: Copy and convert data (inverse the rate)
      // If try_to_usd_rate = 0.03 (1 TRY = 0.03 USD), then usd_to_try_rate = 1/0.03 = 33.33 (1 USD = 33.33 TRY)
      await db.execute(sql`
        UPDATE settings 
        SET usd_to_try_rate = CASE 
          WHEN try_to_usd_rate > 0 THEN ROUND(1.0 / try_to_usd_rate, 4)
          ELSE 34.0000
        END
        WHERE try_to_usd_rate IS NOT NULL
      `);
      console.log("✓ Converted old rates to new format (inverted)");
      
      // Step 3: Drop old column
      await db.execute(sql`
        ALTER TABLE settings 
        DROP COLUMN IF EXISTS try_to_usd_rate
      `);
      console.log("✓ Removed old column 'try_to_usd_rate'");
    } else {
      console.log("Column 'try_to_usd_rate' not found, assuming already migrated or new setup");
      
      // Just ensure new column exists
      await db.execute(sql`
        ALTER TABLE settings 
        ADD COLUMN IF NOT EXISTS usd_to_try_rate NUMERIC(8,4) DEFAULT 34.0000
      `);
      console.log("✓ Ensured 'usd_to_try_rate' column exists");
    }
    
    // Step 4: Add last_rate_update column
    await db.execute(sql`
      ALTER TABLE settings 
      ADD COLUMN IF NOT EXISTS last_rate_update TIMESTAMP WITH TIME ZONE
    `);
    console.log("✓ Added 'last_rate_update' column");
    
    console.log("\n✅ Exchange rate migration completed successfully!");
    console.log("\nNext steps:");
    console.log("1. Restart the server: npm run dev");
    console.log("2. Go to Settings page and click 'Kurları Güncelle' button");
    console.log("3. Rates will be automatically fetched from European Central Bank");
    
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  }
}

// Run migration
migrateExchangeRates()
  .then(() => {
    console.log("\nMigration script finished");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\nMigration script failed:", error);
    process.exit(1);
  });
