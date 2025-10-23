import { db } from "./db";
import { sql } from "drizzle-orm";

async function clearAllTanks() {
  try {
    await db.execute(sql`DELETE FROM tank`);
    console.log('✅ Tüm tank kayıtları silindi');
    process.exit(0);
  } catch (error) {
    console.error('Hata:', error);
    process.exit(1);
  }
}

clearAllTanks();
