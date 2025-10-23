# Loglama Sistemi Kullanım Kılavuzu

## Genel Bakış

Vespro projesi artık profesyonel bir Winston tabanlı loglama sistemine sahip. Bu sistem, özellikle Excel dosya yüklemeleri sırasında oluşan hataları detaylı bir şekilde kaydeder.

## Log Dosyaları

Tüm loglar `logs/` klasöründe saklanır:

```
logs/
├── error-2025-01-23.log        # Sadece hatalar
├── combined-2025-01-23.log     # Tüm log seviyeleri
└── excel-upload-2025-01-23.log # Excel yükleme özel logları
```

### Log Dosyası Özellikleri

- **Otomatik Rotasyon**: Log dosyaları her gün otomatik olarak değişir
- **Boyut Limiti**: Dosya 20-50MB'ı geçerse otomatik olarak yeni dosya oluşturulur
- **Saklama Süresi**: 
  - Error ve Combined loglar: 14 gün
  - Excel upload logları: 30 gün

## Log Seviyeleri

1. **error**: Hatalar ve kritik durumlar
2. **warn**: Uyarılar
3. **info**: Bilgi mesajları
4. **debug**: Debug bilgileri (geliştirme için)

## Excel Yükleme Logları

Excel dosya yüklerken her adım detaylı olarak loglanır:

### 1. Yükleme Başlangıcı
```json
{
  "type": "excel_upload",
  "action": "start",
  "filename": "Tank-001.xlsx",
  "filesize": 524288,
  "timestamp": "2025-01-23T15:30:00.000Z"
}
```

### 2. Sheet İşleme
```json
{
  "type": "excel_upload",
  "action": "sheet_processing",
  "sheetName": "Sheet1",
  "tankCode": "TANK-001"
}
```

### 3. Tank Oluşturma
```json
{
  "type": "excel_upload",
  "action": "tank_created",
  "tankId": "123",
  "tankCode": "TANK-001"
}
```

### 4. Kalem Yükleme
```json
{
  "type": "excel_upload",
  "action": "items_imported",
  "count": 45,
  "tankId": "123"
}
```

### 5. Başarılı Tamamlama
```json
{
  "type": "excel_upload",
  "action": "success",
  "filename": "Tank-001.xlsx",
  "tankId": "123",
  "duration": 2345
}
```

### 6. Hata Durumu
```json
{
  "type": "excel_upload",
  "action": "error",
  "filename": "Tank-001.xlsx",
  "error": {
    "message": "Tank kodu (D2) bulunamadı!",
    "stack": "Error: Tank kodu...",
    "name": "Error"
  },
  "context": {
    "sheetName": "Sheet1",
    "tankData": {
      "cell": "D2",
      "issue": "missing tank code"
    }
  }
}
```

## Logları İnceleme

### Konsol Çıktısı
Geliştirme sırasında loglar renkli olarak konsolda görünür:
```
15:30:00 [info]: Excel upload started
15:30:01 [info]: Processing sheet
15:30:02 [error]: Tank kodu bulunamadı!
```

### Log Dosyalarını Okuma

#### Tüm Excel Hatalarını Görme
```bash
# Windows
type logs\excel-upload-2025-01-23.log | findstr "error"

# Linux/Mac
grep "error" logs/excel-upload-2025-01-23.log
```

#### En Son Hataları Görme
```bash
# Windows
type logs\error-2025-01-23.log

# Linux/Mac  
tail -n 50 logs/error-2025-01-23.log
```

#### Belirli Bir Tank Kodunu Arama
```bash
# Windows
type logs\excel-upload-2025-01-23.log | findstr "TANK-001"

# Linux/Mac
grep "TANK-001" logs/excel-upload-2025-01-23.log
```

## Yaygın Hatalar ve Çözümleri

### 1. "Tank kodu (D2) bulunamadı"
**Sebep**: Excel dosyasındaki D2 hücresi boş  
**Çözüm**: D2 hücresine tank kodunu girin

### 2. "Cell read error"
**Sebep**: Excel hücresinden veri okunamıyor  
**Çözüm**: Log dosyasında hangi hücrede sorun olduğunu kontrol edin

### 3. "Database kısıtlama hatası"
**Sebep**: Veritabanı kısıtlamaları ihlal edildi (örn: duplicate key)  
**Çözüm**: Log detaylarını kontrol edin, muhtemelen aynı tank kodu zaten mevcut

## API Hata Logları

Tüm API hataları otomatik olarak loglanır:
```json
{
  "type": "api_error",
  "endpoint": "/api/excel/upload",
  "method": "POST",
  "error": {
    "message": "Error message",
    "stack": "Full stack trace"
  },
  "requestBody": { ... },
  "userId": "user123"
}
```

## Loglama Seviyesini Değiştirme

`.env` dosyasında loglama seviyesini ayarlayın:
```bash
# Sadece hataları göster
LOG_LEVEL=error

# Tüm logları göster
LOG_LEVEL=debug

# Normal kullanım (varsayılan)
LOG_LEVEL=info
```

## En İyi Uygulamalar

1. **Düzenli İnceleme**: Hata loglarını düzenli olarak kontrol edin
2. **Disk Alanı**: Log klasörünün boyutunu takip edin
3. **Arşivleme**: Eski logları gerekirse arşivleyin
4. **Hata Raporlama**: Hatayı raporlarken ilgili log satırlarını ekleyin

## Destek

Bir hata ile karşılaştığınızda:
1. İlgili log dosyasını açın
2. Hatanın tam zamanını not edin
3. Hata mesajını ve stack trace'i kopyalayın
4. Hangi Excel dosyasını yüklediğinizi belirtin
5. Bu bilgileri destek ekibine iletin
