import { db } from "./db";
import { sql } from "drizzle-orm";

async function queryTankData() {
  try {
    console.log("=== TANK VERİLERİ SORGULAMA ===\n");
    
    // 1. Tank listesi
    console.log("1. TANKLAR:");
    const tanks = await db.execute(sql`
      SELECT 
        tank_kodu, 
        fiyat_tarihi,
        cap_mm,
        silindir_boyu_mm,
        hacim_m3,
        satis_fiyati_eur,
        toplam_agirlik_kg,
        urun_kalitesi
      FROM tank
      ORDER BY fiyat_tarihi DESC NULLS LAST, tank_kodu
      LIMIT 10;
    `);
    
    tanks.rows.forEach((t: any) => {
      console.log(`\n  Tank: ${t.tank_kodu}`);
      console.log(`  Tarih: ${t.fiyat_tarihi || 'YOK'}`);
      console.log(`  Boyutlar: ${t.cap_mm} mm x ${t.silindir_boyu_mm} mm`);
      console.log(`  Hacim: ${t.hacim_m3} m³`);
      console.log(`  Malzeme: ${t.urun_kalitesi}`);
      console.log(`  Ağırlık: ${t.toplam_agirlik_kg} kg`);
      console.log(`  Fiyat: ${t.satis_fiyati_eur} EUR`);
    });
    
    // 2. Kalem sayıları
    console.log("\n\n2. KALEM İSTATİSTİKLERİ:");
    const kalemStats = await db.execute(sql`
      SELECT 
        t.tank_kodu,
        COUNT(k.id) as kalem_sayisi,
        SUM(k.toplam_fiyat_eur) as kalem_toplam_eur,
        COUNT(DISTINCT k.grup_no) as grup_sayisi
      FROM tank t
      LEFT JOIN tank_kalem k ON k.tank_id = t.id
      GROUP BY t.id, t.tank_kodu
      ORDER BY kalem_sayisi DESC;
    `);
    
    kalemStats.rows.forEach((s: any) => {
      console.log(`  ${s.tank_kodu}: ${s.kalem_sayisi} kalem, ${s.grup_sayisi} grup, ${Number(s.kalem_toplam_eur).toFixed(2)} EUR`);
    });
    
    // 3. En pahalı sipariş
    console.log("\n\n3. EN PAHALI SİPARİŞ:");
    const enPahali = await db.execute(sql`
      SELECT 
        t.tank_kodu,
        t.cap_mm,
        t.silindir_boyu_mm,
        t.hacim_m3,
        t.urun_kalitesi,
        t.satis_fiyati_eur,
        t.toplam_agirlik_kg,
        t.satis_fiyati_eur / NULLIF(t.hacim_m3, 0) as eur_per_m3,
        t.satis_fiyati_eur / NULLIF(t.toplam_agirlik_kg, 0) as eur_per_kg
      FROM tank t
      ORDER BY t.satis_fiyati_eur DESC NULLS LAST
      LIMIT 1;
    `);
    
    const p = enPahali.rows[0];
    console.log(`  Tank: ${p.tank_kodu}`);
    console.log(`  Boyutlar: ${p.cap_mm} mm x ${p.silindir_boyu_mm} mm`);
    console.log(`  Hacim: ${p.hacim_m3} m³`);
    console.log(`  Malzeme: ${p.urun_kalitesi}`);
    console.log(`  Toplam Fiyat: ${Number(p.satis_fiyati_eur).toFixed(2)} EUR`);
    console.log(`  EUR/m³: ${Number(p.eur_per_m3).toFixed(2)}`);
    console.log(`  EUR/kg: ${Number(p.eur_per_kg).toFixed(4)}`);
    
    // 4. Grup bazında maliyet dağılımı
    console.log("\n\n4. GRUP BAZINDA MALİYET DAĞILIMI (En pahalı sipariş için):");
    const gruplar = await db.execute(sql`
      SELECT 
        k.grup_no,
        COUNT(*) as kalem_sayisi,
        SUM(k.toplam_fiyat_eur) as grup_toplam_eur,
        AVG(k.birim_fiyat_eur) as ortalama_birim_fiyat
      FROM tank_kalem k
      WHERE k.tank_id = (
        SELECT id FROM tank ORDER BY satis_fiyati_eur DESC LIMIT 1
      )
      GROUP BY k.grup_no
      ORDER BY grup_toplam_eur DESC NULLS LAST;
    `);
    
    gruplar.rows.forEach((g: any) => {
      console.log(`  Grup ${g.grup_no}: ${g.kalem_sayisi} kalem, ${Number(g.grup_toplam_eur).toFixed(2)} EUR`);
    });
    
    // 5. ChatBot için örnek sorgular
    console.log("\n\n5. CHATBOT İÇİN ÖRNEK SORGULAR:");
    console.log("\n  Sorgu 1: Tank özelliklerine göre arama");
    console.log("  SQL:");
    console.log(`  SELECT * FROM tank WHERE cap_mm >= 2000 AND hacim_m3 > 15;`);
    
    console.log("\n  Sorgu 2: Fiyat karşılaştırması");
    console.log("  SQL:");
    console.log(`  SELECT tank_kodu, satis_fiyati_eur, 
         satis_fiyati_eur/hacim_m3 as eur_per_m3
       FROM tank ORDER BY eur_per_m3 DESC;`);
    
    console.log("\n  Sorgu 3: Maliyet kalemleri detayı");
    console.log("  SQL:");
    console.log(`  SELECT t.tank_kodu, k.maliyet_faktoru, k.toplam_fiyat_eur
       FROM tank t
       JOIN tank_kalem k ON k.tank_id = t.id
       WHERE t.tank_kodu = '1788V01-EV1'
       ORDER BY k.toplam_fiyat_eur DESC LIMIT 10;`);
    
    console.log("\n\n✅ Sorgulama tamamlandı!");
    
  } catch (error) {
    console.error("❌ Hata:", error);
    throw error;
  } finally {
    process.exit(0);
  }
}

queryTankData();
