import { db } from "./db";
import { sql } from "drizzle-orm";
import XLSX from "xlsx";
import * as path from "path";

// Helper: Extract number from text (e.g., "0 BAR" -> 0, "2250 mm" -> 2250)
function extractNumber(val: any): number | null {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'number') return val;
  const str = String(val).replace(/,/g, '.');
  const match = str.match(/-?\d+\.?\d*/);
  return match ? parseFloat(match[0]) : null;
}

// Helper: Parse date (Excel serial number destekli)
function parseDate(val: any): string | null {
  if (!val) return null;
  
  // Excel serial number (sayı formatında tarih)
  if (typeof val === 'number') {
    // Excel tarihleri 1899-12-30'dan itibaren gün sayısı olarak saklanır
    // 1: 1900-01-01, 2: 1900-01-02, vb.
    const excelEpoch = new Date(Date.UTC(1899, 11, 30)); // 30 Aralık 1899
    const date = new Date(excelEpoch.getTime() + val * 86400000); // val * 24*60*60*1000
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  }
  
  // Date object
  if (val instanceof Date) {
    return val.toISOString().split('T')[0];
  }
  
  // String formatında tarih
  if (typeof val === 'string') {
    const date = new Date(val);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  }
  
  return null;
}

// Helper: Get cell value safely
function getCellValue(sheet: XLSX.WorkSheet, cell: string): any {
  const cellObj = sheet[cell];
  return cellObj ? cellObj.v : null;
}

async function importTankExcel(filePath: string) {
  try {
    console.log(`\n=== EXCEL IMPORT: ${path.basename(filePath)} ===\n`);
    
    // Read Excel file
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0]; // First sheet
    const sheet = workbook.Sheets[sheetName];
    
    // Dosya yolunu kaydet (relative path)
    const excelFileName = path.basename(filePath);
    
    console.log(`Sayfa: ${sheetName}`);
    
    // === 1. ÜST BİLGİ (Satır 2-3) ===
    const tankKodu = getCellValue(sheet, 'D2');
    if (!tankKodu) {
      throw new Error('Tank kodu (D2) bulunamadı!');
    }
    
    const tankData = {
      tank_kodu: String(tankKodu),
      fiyat_tarihi: (() => {
        const rawDate = getCellValue(sheet, 'N2');
        console.log(`N2 hücre değeri:`, rawDate, `Tipi:`, typeof rawDate);
        const parsed = parseDate(rawDate);
        console.log(`Parse edilmiş tarih:`, parsed);
        return parsed;
      })(),
      yalitim_kod: getCellValue(sheet, 'E2'),
      yalitim_aciklama: getCellValue(sheet, 'E3'),
      yalitim_malzeme: getCellValue(sheet, 'D3'),
      karistirici_kod: getCellValue(sheet, 'F2'),
      karistirici_aciklama: getCellValue(sheet, 'F3'),
      ceket_kod: getCellValue(sheet, 'G2'),
      ceket_aciklama: getCellValue(sheet, 'G3'),
      cap_mm: extractNumber(getCellValue(sheet, 'I2')),
      silindir_boyu_mm: extractNumber(getCellValue(sheet, 'K2')),
      cevre_ara_hesap: extractNumber(getCellValue(sheet, 'M2')),
      hacim_m3: extractNumber(getCellValue(sheet, 'H3')),
      urun_kalitesi: getCellValue(sheet, 'I3'),
      basinc_bar: extractNumber(getCellValue(sheet, 'K3')),
      toplam_agirlik_kg: extractNumber(getCellValue(sheet, 'P3')),
      satis_fiyati_eur: extractNumber(getCellValue(sheet, 'P2')),
      sicaklik_c: extractNumber(getCellValue(sheet, 'Q3')),
      ortam_c: extractNumber(getCellValue(sheet, 'R3')),
      revizyon_no: extractNumber(getCellValue(sheet, 'O3')),
      ozet_etiketi: getCellValue(sheet, 'M3'),
    };
    
    console.log(`Tank: ${tankData.tank_kodu}`);
    console.log(`Tarih: ${tankData.fiyat_tarihi || 'YOK'}`);
    console.log(`Çap: ${tankData.cap_mm} mm, Uzunluk: ${tankData.silindir_boyu_mm} mm`);
    console.log(`Hacim: ${tankData.hacim_m3} m³, Fiyat: ${tankData.satis_fiyati_eur} EUR`);
    
    // UPSERT tank (Excel dosya yolu ile birlikte)
    const tankResult = await db.execute(sql`
      INSERT INTO tank (
        tank_kodu, fiyat_tarihi, yalitim_kod, yalitim_aciklama, yalitim_malzeme,
        karistirici_kod, karistirici_aciklama, ceket_kod, ceket_aciklama,
        cap_mm, silindir_boyu_mm, cevre_ara_hesap, hacim_m3, urun_kalitesi,
        basinc_bar, toplam_agirlik_kg, satis_fiyati_eur, sicaklik_c,
        ortam_c, revizyon_no, ozet_etiketi, excel_file_path
      ) VALUES (
        ${tankData.tank_kodu}, ${tankData.fiyat_tarihi}, ${tankData.yalitim_kod},
        ${tankData.yalitim_aciklama}, ${tankData.yalitim_malzeme}, ${tankData.karistirici_kod},
        ${tankData.karistirici_aciklama}, ${tankData.ceket_kod}, ${tankData.ceket_aciklama},
        ${tankData.cap_mm}, ${tankData.silindir_boyu_mm}, ${tankData.cevre_ara_hesap},
        ${tankData.hacim_m3}, ${tankData.urun_kalitesi}, ${tankData.basinc_bar},
        ${tankData.toplam_agirlik_kg}, ${tankData.satis_fiyati_eur}, ${tankData.sicaklik_c},
        ${tankData.ortam_c}, ${tankData.revizyon_no}, ${tankData.ozet_etiketi}, ${excelFileName}
      )
      ON CONFLICT (tank_kodu, fiyat_tarihi) 
      DO UPDATE SET
        yalitim_kod = EXCLUDED.yalitim_kod,
        yalitim_aciklama = EXCLUDED.yalitim_aciklama,
        cap_mm = EXCLUDED.cap_mm,
        silindir_boyu_mm = EXCLUDED.silindir_boyu_mm,
        hacim_m3 = EXCLUDED.hacim_m3,
        satis_fiyati_eur = EXCLUDED.satis_fiyati_eur,
        toplam_agirlik_kg = EXCLUDED.toplam_agirlik_kg,
        excel_file_path = EXCLUDED.excel_file_path,
        updated_at = NOW()
      RETURNING id;
    `);
    
    const tankId = tankResult.rows[0].id;
    console.log(`\n✅ Tank kaydedildi (ID: ${tankId})\n`);
    
    // === 2. KALEMLER (Satır 8+) ===
    console.log("Kalemler okunuyor...");
    
    // Delete old items for clean reimport
    await db.execute(sql`DELETE FROM tank_kalem WHERE tank_id = ${tankId}`);
    
    let kalemCount = 0;
    const colMap = { B: 'grup_no', C: 'sira_no', D: 'maliyet_faktoru', E: 'malzeme_kalitesi', 
                     F: 'malzeme_tipi', G: 'ebat_1_mm', H: 'ebat_2_mm', I: 'ebat_3', 
                     J: 'ebat_4', K: 'adet', L: 'toplam_miktar', M: 'birim', 
                     N: 'birim_fiyat_eur', O: 'toplam_fiyat_eur', P: 'malzemenin_durumu',
                     Q: 'kategori_atolye_iscilik', R: 'kategori_dis_tedarik', T: 'kategori_atolye_iscilik_2' };
    
    for (let row = 8; row <= 162; row++) {
      const grupNo = getCellValue(sheet, `B${row}`);
      const siraNo = getCellValue(sheet, `C${row}`);
      const malyetFaktoru = getCellValue(sheet, `D${row}`);
      
      // Skip empty rows
      if (!grupNo && !siraNo && !malyetFaktoru) continue;
      
      await db.execute(sql`
        INSERT INTO tank_kalem (
          tank_id, grup_no, sira_no, maliyet_faktoru, malzeme_kalitesi, malzeme_tipi,
          malzemenin_durumu, ebat_1_mm, ebat_2_mm, ebat_3, ebat_4, adet, toplam_miktar,
          birim, birim_fiyat_eur, toplam_fiyat_eur, kategori_atolye_iscilik,
          kategori_dis_tedarik, kategori_atolye_iscilik_2
        ) VALUES (
          ${tankId}, ${grupNo}, ${siraNo}, ${malyetFaktoru},
          ${getCellValue(sheet, `E${row}`)}, ${getCellValue(sheet, `F${row}`)},
          ${getCellValue(sheet, `P${row}`)}, ${extractNumber(getCellValue(sheet, `G${row}`))},
          ${extractNumber(getCellValue(sheet, `H${row}`))}, ${extractNumber(getCellValue(sheet, `I${row}`))},
          ${extractNumber(getCellValue(sheet, `J${row}`))}, ${extractNumber(getCellValue(sheet, `K${row}`))},
          ${extractNumber(getCellValue(sheet, `L${row}`))}, ${getCellValue(sheet, `M${row}`)},
          ${extractNumber(getCellValue(sheet, `N${row}`))}, ${extractNumber(getCellValue(sheet, `O${row}`))},
          ${getCellValue(sheet, `Q${row}`) ? 1 : 0}, ${getCellValue(sheet, `R${row}`) ? 1 : 0},
          ${getCellValue(sheet, `T${row}`) ? 1 : 0}
        )
        ON CONFLICT (tank_id, grup_no, sira_no, maliyet_faktoru)
        DO UPDATE SET
          toplam_fiyat_eur = EXCLUDED.toplam_fiyat_eur,
          toplam_miktar = EXCLUDED.toplam_miktar
      `);
      kalemCount++;
    }
    
    console.log(`✅ ${kalemCount} kalem kaydedildi`);
    
    // === 3. İŞÇİLİK (Satır 163-165) ===
    await db.execute(sql`DELETE FROM tank_iscilik WHERE tank_id = ${tankId}`);
    
    const iscilikRows = [
      { row: 163, name: 'ATÖLYE İMALAT İŞÇİLİĞİ' },
      { row: 164, name: 'PAKETLEME' },
      { row: 165, name: 'SAHA İMALAT İŞÇİLİĞİ' }
    ];
    
    for (const item of iscilikRows) {
      const kalemAdi = getCellValue(sheet, `D${item.row}`) || item.name;
      const toplamAdamGun = extractNumber(getCellValue(sheet, `L${item.row}`));
      const birimGunluk = extractNumber(getCellValue(sheet, `N${item.row}`));
      const toplamFiyat = extractNumber(getCellValue(sheet, `O${item.row}`));
      
      if (toplamAdamGun || toplamFiyat) {
        await db.execute(sql`
          INSERT INTO tank_iscilik (
            tank_id, kalem_adi, toplam_adam_gun, birim_gunluk_eur, toplam_fiyat_eur
          ) VALUES (
            ${tankId}, ${kalemAdi}, ${toplamAdamGun}, ${birimGunluk}, ${toplamFiyat}
          )
          ON CONFLICT (tank_id, kalem_adi) 
          DO UPDATE SET toplam_fiyat_eur = EXCLUDED.toplam_fiyat_eur
        `);
      }
    }
    
    console.log(`✅ İşçilik kalemleri kaydedildi`);
    
    // === 4. LOJİSTİK/GİDER (Satır 166-169) ===
    await db.execute(sql`DELETE FROM tank_lojistik_gider WHERE tank_id = ${tankId}`);
    
    const lojistikRows = [166, 167, 168, 169];
    for (const row of lojistikRows) {
      const kalemAdi = getCellValue(sheet, `D${row}`);
      const toplamFiyat = extractNumber(getCellValue(sheet, `O${row}`));
      
      if (kalemAdi && toplamFiyat) {
        await db.execute(sql`
          INSERT INTO tank_lojistik_gider (
            tank_id, kalem_adi, carpim_1, carpim_2, carpim_3, birim,
            toplam_fiyat_eur
          ) VALUES (
            ${tankId}, ${kalemAdi}, ${extractNumber(getCellValue(sheet, `J${row}`))},
            ${extractNumber(getCellValue(sheet, `K${row}`))}, ${extractNumber(getCellValue(sheet, `L${row}`))},
            ${getCellValue(sheet, `M${row}`)}, ${toplamFiyat}
          )
          ON CONFLICT (tank_id, kalem_adi)
          DO UPDATE SET toplam_fiyat_eur = EXCLUDED.toplam_fiyat_eur
        `);
      }
    }
    
    console.log(`✅ Lojistik/gider kalemleri kaydedildi`);
    
    // === 5. PARAMETRELER (Satır 188-192) ===
    await db.execute(sql`DELETE FROM tank_parametre WHERE tank_id = ${tankId}`);
    
    await db.execute(sql`
      INSERT INTO tank_parametre (
        tank_id, rontgen_birim_yol_ucreti_eur_per_km, is_mesafe_km,
        toplam_malzeme_agirligi_kg, birim_iscilik_eur_per_kg, toplam_tutar_eur
      ) VALUES (
        ${tankId}, ${extractNumber(getCellValue(sheet, 'E188'))},
        ${extractNumber(getCellValue(sheet, 'G189'))}, ${extractNumber(getCellValue(sheet, 'O190'))},
        ${extractNumber(getCellValue(sheet, 'O191'))}, ${extractNumber(getCellValue(sheet, 'O188'))}
      )
      ON CONFLICT (tank_id) DO UPDATE SET
        toplam_tutar_eur = EXCLUDED.toplam_tutar_eur
    `);
    
    console.log(`✅ Parametreler kaydedildi`);
    
    // === VALIDATION ===
    console.log("\n=== DOĞRULAMA ===");
    
    const validation = await db.execute(sql`
      SELECT 
        t.tank_kodu,
        t.satis_fiyati_eur,
        t.toplam_agirlik_kg,
        COUNT(k.id) as kalem_sayisi,
        SUM(k.toplam_fiyat_eur) as kalem_toplam,
        (SELECT toplam_tutar_eur FROM tank_parametre WHERE tank_id = t.id) as parametre_toplam
      FROM tank t
      LEFT JOIN tank_kalem k ON k.tank_id = t.id
      WHERE t.id = ${tankId}
      GROUP BY t.id, t.tank_kodu, t.satis_fiyati_eur, t.toplam_agirlik_kg
    `);
    
    const v = validation.rows[0];
    console.log(`Tank: ${v.tank_kodu}`);
    console.log(`Kalem Sayısı: ${v.kalem_sayisi}`);
    console.log(`Satış Fiyatı: ${v.satis_fiyati_eur} EUR`);
    console.log(`Parametre Toplam: ${v.parametre_toplam} EUR`);
    console.log(`Kalem Toplam: ${v.kalem_toplam} EUR`);
    
    const fiyatFarki = Math.abs(Number(v.satis_fiyati_eur || 0) - Number(v.parametre_toplam || 0));
    if (fiyatFarki > 100) {
      console.log(`⚠️  Fiyat farkı: ${fiyatFarki.toFixed(2)} EUR`);
    } else {
      console.log(`✅ Fiyatlar uyumlu`);
    }
    
    console.log(`\n✅ Import tamamlandı!`);
    
  } catch (error) {
    console.error("❌ Hata:", error);
    throw error;
  }
}

// Run import
const excelPath = process.argv[2] || path.join(process.cwd(), "uploads", "Vespro - Ekipman Maliyet Analiz Formu.xlsx");
importTankExcel(excelPath).finally(() => process.exit(0));
