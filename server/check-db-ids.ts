import { db } from './db';
import { sql } from 'drizzle-orm';

async function checkDatabaseIds() {
  try {
    console.log('=== TANK TABLOSU ===');
    const tanksResult = await db.execute(sql`
      SELECT id, tank_kodu, created_at 
      FROM tank 
      ORDER BY id;
    `);
    
    console.log(`Toplam ${tanksResult.rows.length} tank kaydı bulundu:`);
    tanksResult.rows.forEach((row: any) => {
      console.log(`  ID: ${row.id}, Kod: ${row.tank_kodu}`);
    });
    
    console.log('\n=== ORDERS_LIST_VIEW ===');
    const viewResult = await db.execute(sql`
      SELECT id, kod, source_kind
      FROM orders_list_view 
      ORDER BY id;
    `);
    
    console.log(`Toplam ${viewResult.rows.length} kayıt bulundu:`);
    viewResult.rows.forEach((row: any) => {
      console.log(`  ID: ${row.id}, Kod: ${row.kod}, Kaynak: ${row.source_kind}`);
    });
    
    // ID'leri karşılaştır
    const tankIds = tanksResult.rows.map((r: any) => Number(r.id));
    const viewIds = viewResult.rows.map((r: any) => Number(r.id));
    
    console.log('\n=== KARŞILAŞTIRMA ===');
    console.log('Tank ID\'leri:', tankIds);
    console.log('View ID\'leri:', viewIds);
    
    const viewOnlyIds = viewIds.filter(id => !tankIds.includes(id));
    if (viewOnlyIds.length > 0) {
      console.log('\n⚠️ SORUN: View\'da olup Tank tablosunda OLMAYAN ID\'ler:', viewOnlyIds);
      console.log('Bu ID\'ler silinmiş olabilir ama view güncel değil!');
    }
    
    const tankOnlyIds = tankIds.filter(id => !viewIds.includes(id));
    if (tankOnlyIds.length > 0) {
      console.log('\n⚠️ SORUN: Tank tablosunda olup View\'da OLMAYAN ID\'ler:', tankOnlyIds);
      console.log('View yenilenmesi gerekiyor!');
    }
    
    if (viewOnlyIds.length === 0 && tankOnlyIds.length === 0) {
      console.log('\n✅ ID\'ler eşleşiyor!');
    }
    
  } catch (error) {
    console.error('Hata:', error);
  } finally {
    process.exit(0);
  }
}

checkDatabaseIds();
