import { db } from "./db";
import { sql } from "drizzle-orm";

async function deleteOldTanks() {
  try {
    console.log('Eski tank kayıtları siliniyor...');
    
    // Eski kayıtları sil (ID: 1, 2, 3)
    await db.execute(sql`DELETE FROM tank WHERE id IN (1, 2, 3)`);
    
    console.log('✅ Eski kayıtlar silindi');
    
    // Kalan kayıtları göster
    const remaining = await db.execute(sql`SELECT id, tank_kodu, fiyat_tarihi FROM tank ORDER BY id`);
    console.log('\nKalan kayıtlar:');
    console.log(remaining.rows);
    
    process.exit(0);
  } catch (error) {
    console.error('Hata:', error);
    process.exit(1);
  }
}

deleteOldTanks();
