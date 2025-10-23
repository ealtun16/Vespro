import { db } from './db';
import { sql } from 'drizzle-orm';

async function refreshView() {
  try {
    console.log('View yenileniyor...');
    
    // Drop ve yeniden oluştur
    await db.execute(sql`DROP VIEW IF EXISTS orders_list_view;`);
    console.log('✓ Eski view silindi');
    
    await db.execute(sql`
      CREATE OR REPLACE VIEW orders_list_view AS
      SELECT 
        t.id,
        t.tank_kodu AS kod,
        '' AS customer_name,
        '' AS project_code,
        t.cap_mm AS diameter_mm,
        t.silindir_boyu_mm AS length_mm,
        t.basinc_bar AS pressure_bar,
        NULL AS pressure_text,
        t.hacim_m3 AS volume,
        t.urun_kalitesi AS material_grade,
        t.toplam_agirlik_kg AS total_weight_kg,
        t.satis_fiyati_eur AS total_price_eur,
        NULL AS labor_eur,
        NULL AS outsource_eur,
        t.fiyat_tarihi AS created_date,
        t.created_at,
        t.updated_at,
        'Excel' AS source_kind,
        t.excel_file_path AS source_filename,
        NULL AS source_sheet_id,
        NULL AS sheet_name,
        COALESCE(SUM(tk.toplam_fiyat_eur), 0) AS calculated_total_eur,
        COUNT(tk.id) AS item_count
      FROM tank t
      LEFT JOIN tank_kalem tk ON tk.tank_id = t.id
      GROUP BY 
        t.id,
        t.tank_kodu,
        t.cap_mm,
        t.silindir_boyu_mm,
        t.basinc_bar,
        t.hacim_m3,
        t.urun_kalitesi,
        t.toplam_agirlik_kg,
        t.satis_fiyati_eur,
        t.fiyat_tarihi,
        t.created_at,
        t.updated_at,
        t.excel_file_path;
    `);
    console.log('✓ Yeni view oluşturuldu');
    
    // Kontrol et
    const result = await db.execute(sql`SELECT id, kod FROM orders_list_view;`);
    console.log('\nYeni view içeriği:');
    result.rows.forEach((row: any) => {
      console.log(`  ID: ${row.id}, Kod: ${row.kod}`);
    });
    
    console.log('\n✅ View başarıyla yenilendi!');
  } catch (error) {
    console.error('❌ Hata:', error);
  } finally {
    process.exit(0);
  }
}

refreshView();
