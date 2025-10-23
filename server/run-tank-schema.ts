import { db } from "./db";
import { sql } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";

async function runTankSchema() {
  try {
    console.log("=== YENİ TANK ŞEMASI OLUŞTURMA ===\n");
    
    const sqlPath = path.join(process.cwd(), "server", "create-tank-schema.sql");
    const sqlContent = fs.readFileSync(sqlPath, "utf-8");
    
    console.log("SQL dosyası okundu, çalıştırılıyor...\n");
    
    // Execute the entire SQL file using template literal
    await db.execute(sql`${sql.raw(sqlContent)}`);
    
    console.log("✅ Schema başarıyla oluşturuldu!\n");
    
    // Verify tables
    console.log("Tablolar kontrol ediliyor...\n");
    
    const tables = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('tank', 'tank_kalem', 'tank_iscilik', 'tank_lojistik_gider', 'tank_parametre')
      ORDER BY table_name;
    `);
    
    console.log("Oluşturulan tablolar:");
    tables.rows.forEach((row: any) => {
      console.log(`  ✓ ${row.table_name}`);
    });
    
    console.log("\n✅ Hazır! Excel import script'i hazırlanıyor...");
    
  } catch (error) {
    console.error("❌ Hata:", error);
    throw error;
  } finally {
    process.exit(0);
  }
}

runTankSchema();
