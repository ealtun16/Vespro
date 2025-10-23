import type { Express } from "express";
import { db } from "./db";
import { sql } from "drizzle-orm";
import * as path from "path";
import * as fs from "fs";

export function registerTankApi(app: Express) {
  // Get all tanks
  app.get("/api/tank-forms", async (req, res) => {
    try {
      const tanks = await db.execute(sql`
        SELECT 
          id,
          tank_kodu,
          fiyat_tarihi,
          cap_mm,
          silindir_boyu_mm,
          hacim_m3,
          urun_kalitesi,
          satis_fiyati_eur,
          toplam_agirlik_kg,
          created_at
        FROM tank
        ORDER BY created_at DESC;
      `);
      
      res.json(tanks.rows);
    } catch (error) {
      console.error("Error fetching tanks:", error);
      res.status(500).json({ error: "Failed to fetch tanks" });
    }
  });

  // Get tank detail with items
  app.get("/api/tank-forms/:id", async (req, res) => {
    try {
      const { id } = req.params;
      
      console.log('[GET /api/tank-forms/:id] Request for ID:', id);
      
      // Get tank info (excel_file_path dahil)
      const tankResult = await db.execute(sql`
        SELECT 
          id, tank_kodu, fiyat_tarihi, yalitim_kod, yalitim_aciklama, yalitim_malzeme,
          karistirici_kod, karistirici_aciklama, ceket_kod, ceket_aciklama,
          cap_mm, silindir_boyu_mm, cevre_ara_hesap, hacim_m3, urun_kalitesi,
          basinc_bar, toplam_agirlik_kg, satis_fiyati_eur, sicaklik_c, ortam_c,
          revizyon_no, ozet_etiketi, excel_file_path, created_at, updated_at
        FROM tank 
        WHERE id = ${id};
      `);
      
      console.log('[GET /api/tank-forms/:id] Query result:', tankResult.rows.length, 'rows');
      
      if (tankResult.rows.length === 0) {
        console.error('[GET /api/tank-forms/:id] Tank not found for ID:', id);
        return res.status(404).json({ error: "Tank not found" });
      }
      
      const tank = tankResult.rows[0] as any;
      
      // Get cost items - ensure proper numeric ordering
      const itemsResult = await db.execute(sql`
        SELECT * FROM tank_kalem 
        WHERE tank_id = ${id}
        ORDER BY 
          CAST(grup_no AS INTEGER), 
          CAST(sira_no AS INTEGER);
      `);
      
      // Get parameters
      const paramResult = await db.execute(sql`
        SELECT * FROM tank_parametre WHERE tank_id = ${id};
      `);
      
      // Get labor
      const laborResult = await db.execute(sql`
        SELECT * FROM tank_iscilik WHERE tank_id = ${id};
      `);
      
      // Get logistics
      const logisticsResult = await db.execute(sql`
        SELECT * FROM tank_lojistik_gider WHERE tank_id = ${id};
      `);
      
      // Excel dosya yolunu kontrol et
      const excelFilePath = tank.excel_file_path;
      let excelAvailable = false;
      
      if (excelFilePath) {
        const fullPath = path.join(process.cwd(), 'uploads', excelFilePath);
        excelAvailable = fs.existsSync(fullPath);
      }
      
      res.json({
        ...tank,
        items: itemsResult.rows,
        parametre: paramResult.rows[0] || null,
        iscilik: laborResult.rows,
        lojistik: logisticsResult.rows,
        excel_available: excelAvailable,
        excel_path: excelFilePath
      });
    } catch (error) {
      console.error("Error fetching tank detail:", error);
      res.status(500).json({ error: "Failed to fetch tank detail" });
    }
  });

  // Delete tank with cascade (also deletes Excel file)
  app.delete("/api/tank-forms/:id", async (req, res) => {
    try {
      const { id } = req.params;
      
      // Get tank info first (to get Excel file path)
      const tankResult = await db.execute(sql`
        SELECT excel_file_path FROM tank WHERE id = ${id};
      `);
      
      if (tankResult.rows.length === 0) {
        return res.status(404).json({ error: "Tank not found" });
      }
      
      const tank = tankResult.rows[0] as any;
      const excelFilePath = tank.excel_file_path;
      
      // Delete from database (cascade will delete related records)
      await db.execute(sql`DELETE FROM tank WHERE id = ${id}`);
      
      // Try to delete Excel file if exists (non-critical operation)
      let excelDeleted = false;
      let excelDeleteWarning = null;
      
      if (excelFilePath) {
        try {
          const fullPath = path.join(process.cwd(), 'uploads', excelFilePath);
          if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
            excelDeleted = true;
            console.log(`Excel dosyası silindi: ${excelFilePath}`);
          } else {
            excelDeleteWarning = "Excel dosyası zaten mevcut değil";
            console.warn(`Excel dosyası bulunamadı: ${excelFilePath}`);
          }
        } catch (fileError) {
          // Excel dosyası silinemese bile işlem başarılı sayılır
          excelDeleteWarning = "Excel dosyası silinemedi (dosya kilitli olabilir)";
          console.error(`Excel dosyası silinirken hata: ${excelFilePath}`, fileError);
        }
      }
      
      res.json({ 
        success: true, 
        message: excelDeleted 
          ? "Tank ve Excel dosyası başarıyla silindi" 
          : "Tank silindi" + (excelDeleteWarning ? ` (${excelDeleteWarning})` : ""),
        excelDeleted,
        warning: excelDeleteWarning
      });
    } catch (error) {
      console.error("Error deleting tank:", error);
      res.status(500).json({ error: "Failed to delete tank" });
    }
  });
}
