# Excel Dosya Yapısı Analizi

## Satır 1-3: Header Bilgileri (Üst Kısım)

```
Satır 1: MALİYET ANALİZ FORMU (başlık)
Satır 2: Kod, Tank Adı, Çap, Yükseklik, Hacim, Tarih, Toplam Fiyat
Satır 3: Revizyon, Müşteri Adı, Malzeme, Basınç, Özet Bilgileri
```

### Satır 2 Kolonları:
- D2: Kod (örn: 1788V01-EV1)
- Müşteri adı  
- I2: Tank Çapı (mm)
- K2: Silindir Uzunluğu (mm)
- H3: Hacim (m³)
- N2: Oluşturma Tarihi
- P2: Satış Fiyatı (Toplam EUR)
- P3: Toplam Ağırlık (kg)
- I3: Ürün Kalitesi (malzeme)
- K3: Basınç

## Satır 8+: Maliyet Kalemleri

### Kolonlar (B-T):
- B: Grup No
- C: Sıra No
- D: Maliyet Faktörü
- E: Malzeme Kalitesi
- F: Malzeme Tipi
- G-I: Ebatlar (mm/kg)
- J: kg/m
- K: Adet
- L: Toplam Miktar
- M: Birim
- N: Birim Fiyat (EUR)
- O: Toplam Fiyat (EUR)
- P: Malzeme Durumu
- Q-S: Kategoriler (İşçilik/Dış Tedarik)
- T: Not

## Alt Kısım: Kategori Toplamları

### Grup Bazında Maliyetler:
1. SAÇ MALZEMELER
2. MİL - FLANŞ - BORU - PROFİLLER  
3. NOZULLAR
4. CİVATA CONTA VE SARF MALZEMELER
5. YATAKLAMA MALZEMELERİ SALMASTRA
6. REDÜKTÖR MOTOR - KARIŞTIRICI
7. DİĞER ÖZEL MAKİNA PARÇALARI
8. TEST KONTROL PROJE
9. DIŞ ATÖLYE MALİYETLERİ
10. İZOLASYON, İŞÇİLİK, NAKLİYE, vb.

## Eksik Alanlar (Mevcut DB'de)

### tankOrder tablosunda eksikler:
1. ✅ order_code - VAR
2. ✅ customer_name - VAR
3. ✅ diameter_mm - VAR
4. ✅ length_mm - VAR
5. ✅ volume - VAR
6. ✅ material_grade - VAR
7. ✅ total_price_eur - VAR
8. ✅ total_weight_kg - VAR
9. ✅ pressure_bar - VAR
10. ✅ created_date - VAR

### Yeni gerekli alanlar:
1. **Kategori toplamları** - JSON field olarak eklenecek
2. **Hesaplanmış değerler**:
   - price_per_m3 (EUR/m³)
   - price_per_kg (EUR/kg)
   - material_cost_total
   - labor_cost_total
   - outsource_cost_total

## Önerilen Çözüm

### 1. tankOrder tablosuna yeni alanlar ekle:
```sql
ALTER TABLE tank_order ADD COLUMN IF NOT EXISTS category_totals JSONB DEFAULT '{}'::jsonb;
ALTER TABLE tank_order ADD COLUMN IF NOT EXISTS price_per_m3 NUMERIC(12,2);
ALTER TABLE tank_order ADD COLUMN IF NOT EXISTS price_per_kg NUMERIC(12,4);
ALTER TABLE tank_order ADD COLUMN IF NOT EXISTS material_cost_eur NUMERIC(14,2);
```

### 2. category_totals JSON yapısı:
```json
{
  "1_sac_malzemeler": 33772,
  "2_mil_flans_boru": 120.16,
  "3_nozullar": 13200,
  "4_civata_conta": 4698.94,
  "5_yataklama": 4500,
  "6_motor_karistirici": 0,
  "7_ozel_parcalar": 0,
  "8_test_kontrol": 5567.96,
  "9_dis_atolye": 0,
  "10_izolasyon": 0,
  "10_yuzey_islem": 2319.32,
  "10_atolye_iscilik": 14400,
  "10_saha_iscilik": 0,
  "10_nakliye": 552.82,
  "10_ekipman_nakliye": 0,
  "10_vinc": 0,
  "10_genel_gider": 11511.64
}
```

### 3. View için trigger:
Yeni bir view oluştur ki ChatBot kolayca sorgulasın:
- Tüm siparişleri kategori bilgileriyle
- Hesaplanmış değerlerle (m³ başına fiyat, vb.)
- Filtreleme için optimized
