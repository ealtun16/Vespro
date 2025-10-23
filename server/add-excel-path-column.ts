import { db } from "./db";
import { sql } from "drizzle-orm";

async function addExcelPathColumn() {
  try {
    console.log('Tank tablosuna excel_file_path sütunu ekleniyor...');
    
    await db.execute(sql`
      ALTER TABLE tank 
      ADD COLUMN IF NOT EXISTS excel_file_path TEXT
    `);
    
    console.log('✅ Sütun eklendi');
    
    // Kontrol
    const check = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='tank' AND column_name='excel_file_path'
    `);
    
    console.log('Kontrol:', check.rows.length > 0 ? 'Sütun mevcut' : 'Sütun bulunamadı');
    
    process.exit(0);
  } catch (error) {
    console.error('Hata:', error);
    process.exit(1);
  }
}

addExcelPathColumn();
