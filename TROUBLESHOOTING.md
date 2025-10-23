# Excel Yükleme ve Veri Görüntüleme Sorunları - Troubleshooting

## Problem
- Excel dosyası yüklenirken "başarısız" hatası
- Tank Maliyet Analizi tablosu boş görünüyor

## Çözüm Adımları

### 1. Server'ı Yeniden Başlatın

**ÖNEMLİ:** Değişikliklerin aktif olması için server'ı yeniden başlatmanız gerekiyor!

```bash
# Mevcut çalışan server'ı durdurun (Ctrl+C)
# Sonra tekrar başlatın:
npm run dev
```

### 2. Server Loglarını Kontrol Edin

Server başlatıldığında şu mesajları görmelisiniz:
```
Server running on port 5000
Database connected successfully
```

### 3. Browser Console'u Kontrol Edin

1. Dashboard sayfasını açın
2. F12 tuşuna basın (Developer Tools)
3. Console sekmesine geçin
4. Hataları kontrol edin

### 4. Network Sekmesini Kontrol Edin

1. F12 > Network sekmesi
2. Dashboard'u yenileyin
3. `/api/orders/list` isteğini bulun
4. Response'u kontrol edin:
   - Status code 200 olmalı
   - Response'da `orders` array'i olmalı

### 5. Excel Yükleme Testi

1. Maliyet Analizi Yönetimi sayfasına gidin
2. "Excel Dosyası Yükle" butonuna tıklayın
3. Bir Excel dosyası seçin
4. Network sekmesinde `/api/excel/upload` isteğini kontrol edin
5. Hatayı göreceksiniz

### 6. Manuel API Testi

Terminal'de test edin:
```bash
# API'nin çalışıp çalışmadığını test edin
curl http://localhost:5000/api/orders/list

# Sonuç örneği:
# {"orders":[...]} - BAŞARILI
# {"message":"Failed to fetch orders list"} - HATA
```

## Yaygın Sorunlar ve Çözümleri

### Sorun 1: Database Connection Error
**Belirti:** "Failed to connect to database" hatası
**Çözüm:** 
- PostgreSQL'in çalıştığından emin olun
- .env dosyasındaki DATABASE_URL'i kontrol edin
```bash
DATABASE_URL=postgresql://postgres:Arc1234..@localhost:5432/vespro_db
```

### Sorun 2: Port Already in Use
**Belirti:** "Port 5000 already in use"
**Çözüm:**
```bash
# Windows'ta port kullanan process'i bulun
netstat -ano | findstr :5000

# Process'i sonlandırın (PID numarasını yukarıdaki komuttan alın)
taskkill /PID <PID_NUMBER> /F
```

### Sorun 3: View Not Found
**Belirti:** "relation orders_list_view does not exist"
**Çözüm:**
```bash
# View'ı tekrar oluşturun
npx tsx server/create-views.ts
```

### Sorun 4: BigInt Serialization Error
**Belirti:** "Do not know how to serialize a BigInt"
**Çözüm:** routes.ts dosyasında BigInt'leri String'e çevirme kodu var, server'ı yeniden başlatın

## Debug Modu

Daha detaylı loglar için `server/routes.ts` dosyasında şu satırları ekleyin:

```typescript
app.get("/api/orders/list", async (req, res) => {
  try {
    console.log('=== ORDERS LIST REQUEST ===');
    console.log('Time:', new Date().toISOString());
    
    const orders = await storage.getOrdersList();
    console.log('Orders fetched:', orders.length);
    console.log('First order:', JSON.stringify(orders[0], null, 2));
    
    // ... rest of code
  } catch (error) {
    console.error('DETAILED ERROR:', error);
    // ... rest of error handling
  }
});
```

## Kontrol Listesi

- [ ] Server yeniden başlatıldı
- [ ] PostgreSQL çalışıyor
- [ ] .env dosyası doğru
- [ ] View oluşturuldu
- [ ] Browser console temiz
- [ ] Network requests başarılı
- [ ] API'den data geliyor

## Hala Çalışmıyorsa

Şu bilgileri toplayın:
1. Server console çıktısı (tüm error mesajları)
2. Browser console hataları
3. Network sekmesindeki failed request'lerin detayları
4. `npx tsx server/verify-migration.ts` çıktısı

Bu bilgilerle sorunu daha detaylı analiz edebiliriz.
