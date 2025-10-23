import { db } from "./db";
import { sql } from "drizzle-orm";

async function clearDatabase() {
  try {
    console.log("=== DATABASE TEMİZLEME ===\n");
    console.log("⚠️  UYARI: Tüm veriler silinecek!\n");
    
    // Get counts before deletion
    console.log("Mevcut veri sayıları:");
    
    const tankOrderCount = await db.execute(sql`SELECT COUNT(*) as count FROM tank_order`);
    console.log(`- Tank Orders: ${tankOrderCount.rows[0].count}`);
    
    const costItemCount = await db.execute(sql`SELECT COUNT(*) as count FROM cost_item`);
    console.log(`- Cost Items: ${costItemCount.rows[0].count}`);
    
    const sheetUploadCount = await db.execute(sql`SELECT COUNT(*) as count FROM sheet_upload`);
    console.log(`- Sheet Uploads: ${sheetUploadCount.rows[0].count}`);
    
    try {
      const turkishAnalysisCount = await db.execute(sql`SELECT COUNT(*) as count FROM turkish_cost_analyses`);
      console.log(`- Turkish Cost Analyses: ${turkishAnalysisCount.rows[0].count}`);
    } catch (e) {
      console.log("- Turkish Cost Analyses: 0 (table doesn't exist)");
    }
    
    console.log("\n🗑️  Silme işlemi başlıyor...\n");
    
    // Delete in correct order (due to foreign key constraints)
    
    // 1. Delete cost items first
    console.log("1. Cost items siliniyor...");
    await db.execute(sql`TRUNCATE TABLE cost_item CASCADE`);
    console.log("   ✅ Cost items silindi");
    
    // 2. Delete tank orders
    console.log("2. Tank orders siliniyor...");
    await db.execute(sql`TRUNCATE TABLE tank_order CASCADE`);
    console.log("   ✅ Tank orders silindi");
    
    // 3. Delete sheet uploads
    console.log("3. Sheet uploads siliniyor...");
    await db.execute(sql`TRUNCATE TABLE sheet_upload CASCADE`);
    console.log("   ✅ Sheet uploads silindi");
    
    // 4. Delete Turkish cost analyses if exists
    try {
      console.log("4. Turkish cost analyses siliniyor...");
      await db.execute(sql`TRUNCATE TABLE turkish_cost_items CASCADE`);
      await db.execute(sql`TRUNCATE TABLE turkish_cost_analyses CASCADE`);
      console.log("   ✅ Turkish cost analyses silindi");
    } catch (e) {
      console.log("   ⚠️  Turkish tables not found (skipping)");
    }
    
    // 5. Delete raw data tables
    try {
      console.log("5. Raw data tables siliniyor...");
      await db.execute(sql`TRUNCATE TABLE cost_item_raw CASCADE`);
      await db.execute(sql`TRUNCATE TABLE tank_order_header_raw CASCADE`);
      console.log("   ✅ Raw data tables silindi");
    } catch (e) {
      console.log("   ⚠️  Raw tables not found (skipping)");
    }
    
    // Reset sequences
    console.log("\n6. Sequence'lar sıfırlanıyor...");
    await db.execute(sql`ALTER SEQUENCE IF EXISTS tank_order_id_seq RESTART WITH 1`);
    await db.execute(sql`ALTER SEQUENCE IF EXISTS cost_item_id_seq RESTART WITH 1`);
    await db.execute(sql`ALTER SEQUENCE IF EXISTS sheet_upload_id_seq RESTART WITH 1`);
    console.log("   ✅ Sequence'lar sıfırlandı");
    
    // Verify deletion
    console.log("\n✅ Silme işlemi tamamlandı!\n");
    console.log("Güncel veri sayıları:");
    
    const tankOrderCountAfter = await db.execute(sql`SELECT COUNT(*) as count FROM tank_order`);
    console.log(`- Tank Orders: ${tankOrderCountAfter.rows[0].count}`);
    
    const costItemCountAfter = await db.execute(sql`SELECT COUNT(*) as count FROM cost_item`);
    console.log(`- Cost Items: ${costItemCountAfter.rows[0].count}`);
    
    const sheetUploadCountAfter = await db.execute(sql`SELECT COUNT(*) as count FROM sheet_upload`);
    console.log(`- Sheet Uploads: ${sheetUploadCountAfter.rows[0].count}`);
    
    console.log("\n📝 Sonraki adımlar:");
    console.log("1. Yeni Excel dosyalarını yükleyebilirsiniz");
    console.log("2. Database schema'sı hazır ve temiz");
    console.log("3. ChatBot kullanıma hazır (veri yüklendiğinde)");
    
  } catch (error) {
    console.error("\n❌ Hata:", error);
    throw error;
  } finally {
    process.exit(0);
  }
}

clearDatabase();
