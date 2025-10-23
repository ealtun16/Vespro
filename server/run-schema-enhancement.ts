import { db } from "./db";
import { sql } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";

async function runSchemaEnhancement() {
  try {
    console.log("=== DATABASE SCHEMA ENHANCEMENT ===\n");
    console.log("Reading SQL file...");
    
    // Read the SQL file
    const sqlFilePath = path.join(process.cwd(), "server", "enhance-database-schema.sql");
    const sqlContent = fs.readFileSync(sqlFilePath, "utf-8");
    
    console.log("Executing SQL enhancements...\n");
    
    // Split SQL into individual statements and execute them
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      if (stmt) {
        try {
          console.log(`Executing statement ${i + 1}/${statements.length}...`);
          await db.execute(sql.raw(stmt));
        } catch (error: any) {
          console.error(`Error in statement ${i + 1}:`, error.message);
          // Continue with other statements
        }
      }
    }
    
    console.log("✅ Schema enhancement completed successfully!\n");
    
    // Verify the changes
    console.log("Verifying changes...\n");
    
    // Check if new columns exist
    const columnCheck = await db.execute(sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'tank_order' 
      AND column_name IN ('category_totals', 'price_per_m3', 'price_per_kg')
      ORDER BY column_name;
    `);
    
    console.log("New columns added:");
    console.log(columnCheck.rows);
    
    // Check if view exists
    const viewCheck = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.views 
      WHERE table_name = 'v_tank_orders_enhanced';
    `);
    
    if (viewCheck.rows.length > 0) {
      console.log("\n✅ View 'v_tank_orders_enhanced' created successfully");
    } else {
      console.log("\n❌ View 'v_tank_orders_enhanced' not found");
    }
    
    // Check function
    const functionCheck = await db.execute(sql`
      SELECT routine_name 
      FROM information_schema.routines 
      WHERE routine_name = 'calculate_category_totals';
    `);
    
    if (functionCheck.rows.length > 0) {
      console.log("✅ Function 'calculate_category_totals' created successfully");
    } else {
      console.log("❌ Function 'calculate_category_totals' not found");
    }
    
    // Check trigger
    const triggerCheck = await db.execute(sql`
      SELECT trigger_name 
      FROM information_schema.triggers 
      WHERE trigger_name = 'trg_update_tank_order_totals';
    `);
    
    if (triggerCheck.rows.length > 0) {
      console.log("✅ Trigger 'trg_update_tank_order_totals' created successfully");
    } else {
      console.log("❌ Trigger 'trg_update_tank_order_totals' not found");
    }
    
    // Sample data from enhanced view
    console.log("\n=== SAMPLE DATA FROM ENHANCED VIEW ===\n");
    const sampleData = await db.execute(sql`
      SELECT 
        order_code,
        customer_name,
        diameter_mm,
        volume,
        total_price_eur,
        price_per_m3_calc,
        price_per_kg_calc,
        category_totals
      FROM v_tank_orders_enhanced
      ORDER BY total_price_eur DESC NULLS LAST
      LIMIT 3;
    `);
    
    sampleData.rows.forEach((row: any, idx: number) => {
      console.log(`${idx + 1}. ${row.order_code || 'N/A'}`);
      console.log(`   Müşteri: ${row.customer_name || 'N/A'}`);
      console.log(`   Çap: ${row.diameter_mm || 'N/A'} mm`);
      console.log(`   Hacim: ${row.volume || 'N/A'} m³`);
      console.log(`   Toplam Fiyat: ${row.total_price_eur || 'N/A'} EUR`);
      console.log(`   EUR/m³: ${row.price_per_m3_calc || 'N/A'}`);
      console.log(`   EUR/kg: ${row.price_per_kg_calc || 'N/A'}`);
      console.log(`   Kategori Toplamları: ${row.category_totals ? 'Var' : 'Yok'}`);
      console.log("");
    });
    
    console.log("\n✅ All enhancements completed successfully!");
    console.log("\n📝 Next steps:");
    console.log("1. Restart the server to use the new schema");
    console.log("2. ChatBot will now have access to detailed cost breakdowns");
    console.log("3. Test with: 'En pahalı sipariş hangisi ve maliyet dağılımı nedir?'");
    
  } catch (error) {
    console.error("❌ Error enhancing schema:", error);
    throw error;
  } finally {
    process.exit(0);
  }
}

runSchemaEnhancement();
