import { db } from "./db";
import { sql } from "drizzle-orm";

async function checkTankData() {
  try {
    const result = await db.execute(sql`
      SELECT id, tank_kodu, fiyat_tarihi, created_at, excel_file_path 
      FROM tank 
      WHERE id = 6;
    `);
    
    console.log('Tank ID:6 Bilgileri:');
    console.log(JSON.stringify(result.rows[0], null, 2));
    
    // Excel dosyasını kontrol et
    if (result.rows[0]) {
      const tankData = result.rows[0] as any;
      console.log('\n=== KONTROL ===');
      console.log('Excel File Path:', tankData.excel_file_path || 'YOK!');
      console.log('Fiyat Tarihi:', tankData.fiyat_tarihi);
      console.log('Created At:', tankData.created_at);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Hata:', error);
    process.exit(1);
  }
}

checkTankData();
