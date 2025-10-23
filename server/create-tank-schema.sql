-- === YENİ TANK ŞEMASI - DDL ===
-- Tekrar çalıştırılabilir (idempotent) schema

CREATE TABLE IF NOT EXISTS tank (
  id BIGSERIAL PRIMARY KEY,
  tank_kodu TEXT NOT NULL,                -- D2
  fiyat_tarihi DATE,                      -- N2 (tarih)
  yalitim_kod TEXT,                       -- E2
  yalitim_aciklama TEXT,                  -- E3 (örn: "YOK")
  yalitim_malzeme TEXT,                   -- D3 (örn: "EVATHERM")
  karistirici_kod TEXT,                   -- F2
  karistirici_aciklama TEXT,              -- F3 (örn: "YOK")
  ceket_kod TEXT,                         -- G2
  ceket_aciklama TEXT,                    -- G3 (örn: "1220YOK")
  cap_mm NUMERIC(12,3),                   -- I2
  silindir_boyu_mm NUMERIC(12,3),         -- K2
  cevre_ara_hesap NUMERIC(18,9),          -- M2
  hacim_m3 NUMERIC(18,9),                 -- H3
  urun_kalitesi TEXT,                     -- I3 (örn: "super duplex-1.4410")
  basinc_bar NUMERIC(12,3),               -- K3 (yalnız sayı: "0 BAR" -> 0)
  toplam_agirlik_kg NUMERIC(18,6),        -- P3
  satis_fiyati_eur NUMERIC(18,6),         -- P2
  sicaklik_c NUMERIC(12,3),               -- Q3 (Q2 başlığı "SICAKLIK")
  ortam_c NUMERIC(12,3),                  -- R3
  revizyon_no NUMERIC(12,3),              -- O3 (N3 başlığı "REVİZYON")
  ozet_etiketi TEXT,                      -- M3 ("ÖZET" gibi)
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (tank_kodu, fiyat_tarihi)
);

CREATE TABLE IF NOT EXISTS tank_kalem (
  id BIGSERIAL PRIMARY KEY,
  tank_id BIGINT NOT NULL REFERENCES tank(id) ON DELETE CASCADE,
  grup_no TEXT,                           -- B*
  sira_no TEXT,                           -- C*
  maliyet_faktoru TEXT,                   -- D*
  malzeme_kalitesi TEXT,                  -- E*
  malzeme_tipi TEXT,                      -- F*
  malzemenin_durumu TEXT,                 -- P* (başlıkta "Malzemenin Durumu")
  ebat_1_mm NUMERIC(18,6),                -- G* (başlık "mm")
  ebat_2_mm NUMERIC(18,6),                -- H* (başlık "mm")
  ebat_3 NUMERIC(18,6),                   -- I* (başlık "mm-kg")
  ebat_4 NUMERIC(18,6),                   -- J* (başlık "kg - m")
  adet NUMERIC(18,6),                     -- K*
  toplam_miktar NUMERIC(18,6),            -- L*
  birim TEXT,                              -- M*
  birim_fiyat_eur NUMERIC(18,6),          -- N*
  toplam_fiyat_eur NUMERIC(18,6),         -- O*
  kategori_atolye_iscilik INTEGER,        -- Q* (başlık "ATÖLYE İŞÇİLİK"): 1/0
  kategori_dis_tedarik INTEGER,           -- R* (başlık "DIŞ TEDARİK"): 1/0
  kategori_atolye_iscilik_2 INTEGER,      -- T* (sağ bloktaki tekrar eden alan): 1/0
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT tank_kalem_unique UNIQUE (tank_id, grup_no, sira_no, maliyet_faktoru)
);

-- İşçilik (adam-gün) kalemleri (satırlar 163–165 ve benzerleri)
CREATE TABLE IF NOT EXISTS tank_iscilik (
  id BIGSERIAL PRIMARY KEY,
  tank_id BIGINT NOT NULL REFERENCES tank(id) ON DELETE CASCADE,
  kalem_adi TEXT,                         -- D163..D165
  adam_sayisi NUMERIC(12,3),              -- G163 veya I/J kombinasyonları
  gun_sayisi NUMERIC(12,3),               -- K163/K164 = "GÜN"
  toplam_adam_gun NUMERIC(18,6),          -- L163/L164
  birim_gunluk_eur NUMERIC(18,6),         -- N163/N164
  toplam_fiyat_eur NUMERIC(18,6),         -- O163/O164
  kategori_atolye_iscilik INTEGER,        -- Q163..: 1/0
  kategori_dis_tedarik INTEGER,           -- R* : 1/0
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT tank_iscilik_unique UNIQUE (tank_id, kalem_adi)
);

-- Lojistik / Nakliye / Vinç / Genel gider payı
CREATE TABLE IF NOT EXISTS tank_lojistik_gider (
  id BIGSERIAL PRIMARY KEY,
  tank_id BIGINT NOT NULL REFERENCES tank(id) ON DELETE CASCADE,
  kalem_adi TEXT,                         -- D166..D169
  carpim_1 NUMERIC(18,6),                 -- J166..
  carpim_2 NUMERIC(18,6),                 -- K166..
  carpim_3 NUMERIC(18,6),                 -- L166..
  birim TEXT,                             -- M166..
  oran_1 NUMERIC(18,6),                   -- G169
  oran_2 NUMERIC(18,6),                   -- H169
  oran_toplam NUMERIC(18,6),              -- I169
  carpim_carpan_1 NUMERIC(18,6),          -- J169
  carpim_carpan_2 NUMERIC(18,6),          -- K169
  carpim_carpan_3 NUMERIC(18,6),          -- L169
  aciklama TEXT,                          -- M169
  birim_fiyat_eur NUMERIC(18,6),          -- N166..N169
  toplam_fiyat_eur NUMERIC(18,6),         -- O166..O169
  kategori_atolye_iscilik INTEGER,        -- R* : 1/0
  kategori_atolye_iscilik_2 INTEGER,      -- T* : 1/0
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT tank_lojistik_unique UNIQUE (tank_id, kalem_adi)
);

-- Özet / Parametreler (satırlar 188–192)
CREATE TABLE IF NOT EXISTS tank_parametre (
  id BIGSERIAL PRIMARY KEY,
  tank_id BIGINT NOT NULL REFERENCES tank(id) ON DELETE CASCADE,
  rontgen_birim_yol_ucreti_eur_per_km NUMERIC(18,6),  -- E188
  is_mesafe_km NUMERIC(18,6),                         -- G189
  toplam_malzeme_agirligi_kg NUMERIC(18,6),           -- O190
  birim_iscilik_eur_per_kg NUMERIC(18,6),             -- O191
  yerinde_konaklama_gun NUMERIC(18,6),                -- E191
  yerinde_konaklama_usd_gun NUMERIC(18,6),            -- F191 "USD/GÜN"
  yerinde_konaklama_eur_gun NUMERIC(18,6),            -- H191 "EURO/GÜN"
  toplam_tutar_eur NUMERIC(18,6),                     -- O188
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT tank_parametre_unique UNIQUE (tank_id)
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_tank_kod ON tank(tank_kodu);
CREATE INDEX IF NOT EXISTS idx_tank_tarih ON tank(fiyat_tarihi);
CREATE INDEX IF NOT EXISTS idx_tank_kalem_tank ON tank_kalem(tank_id);
CREATE INDEX IF NOT EXISTS idx_tank_iscilik_tank ON tank_iscilik(tank_id);
CREATE INDEX IF NOT EXISTS idx_tank_lojistik_tank ON tank_lojistik_gider(tank_id);

-- Comments
COMMENT ON TABLE tank IS 'Ana tank bilgileri - Excel üst bilgi (satır 2-3)';
COMMENT ON TABLE tank_kalem IS 'Tank maliyet kalemleri - Excel satır 8+';
COMMENT ON TABLE tank_iscilik IS 'İşçilik kalemleri (adam-gün) - Excel satır 163-165';
COMMENT ON TABLE tank_lojistik_gider IS 'Lojistik ve genel gider kalemleri - Excel satır 166-169';
COMMENT ON TABLE tank_parametre IS 'Özet ve parametreler - Excel satır 188-192';
