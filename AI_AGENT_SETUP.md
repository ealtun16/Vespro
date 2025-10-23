# Vespro AI Agent Kurulum Rehberi

## OpenRouter API ile Claude Sonnet 4.5 Entegrasyonu

Vespro uygulaması artık OpenRouter üzerinden Claude Sonnet 4.5 kullanarak gelişmiş tank maliyet analizi yapabiliyor.

## Özellikler

✅ **Gerçek Zamanlı Chat Arayüzü**: Kullanıcı dostu sohbet arayüzü ile AI agent'a soru sorabilirsiniz
✅ **Geçmiş Sipariş Analizi**: 104+ geçmiş sipariş verisi üzerinden akıllı fiyat tahminleri
✅ **Tank Özellikleri Bazlı Fiyatlandırma**: Çap, hacim, malzeme kalitesi, basınç, sıcaklık vb. parametrelere göre fiyat hesaplama
✅ **Türkçe Destek**: Tamamen Türkçe yanıtlar ve teknik terminoloji
✅ **Benzer Sipariş Önerileri**: Geçmiş siparişlerden benzer örnekler sunma

## Kurulum Adımları

### 1. OpenRouter API Key Alma

1. [OpenRouter](https://openrouter.ai) sitesine gidin
2. Hesap oluşturun veya giriş yapın
3. API Keys bölümünden yeni bir API key oluşturun
4. API key'inizi kopyalayın

### 2. API Key Yapılandırması

`.env` dosyasını açın ve API key'inizi ekleyin:

```env
DATABASE_URL=postgresql://postgres:Arc1234..@localhost:5432/vespro_db
NODE_ENV=development
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**ÖNEMLİ**: `your_openrouter_api_key_here` yerine gerçek API key'inizi yazın!

### 3. Sunucuyu Yeniden Başlatın

API key'i ekledikten sonra sunucuyu yeniden başlatın:

```bash
# Ctrl+C ile mevcut sunucuyu durdurun
# Sonra tekrar başlatın
npm run dev
```

## Kullanım

### Chat Arayüzü

1. Sol menüden **"Ajana Sor"** sekmesine tıklayın
2. Mesaj kutusuna sorunuzu yazın
3. Enter tuşuna basın veya gönder butonuna tıklayın

### Örnek Sorular

```
🔹 2000 m³ hacimli bir tank için tahmini fiyat nedir?
🔹 Super duplex malzeme ile standart çelik arasındaki fark nedir?
🔹 İzolasyon eklemek maliyeti ne kadar artırır?
🔹 3000mm çapında, 5000mm uzunluğunda, 10 bar basınçlı bir tank kaç € tutar?
🔹 Karıştırıcı ve ceket eklerseniz fiyat nasıl değişir?
```

## Teknik Detaylar

### Backend Endpoint'leri

#### Chat Endpoint
```typescript
POST /api/agent/chat
{
  "message": "Kullanıcı mesajı",
  "context": { ... }
}
```

#### Fiyat Tahmini
```typescript
POST /api/agent/estimate
{
  "diameter": 3000,
  "volume": 2000,
  "materialGrade": "super duplex",
  "insulation": true,
  "mixer": true
}
```

#### Geçmiş Siparişler
```typescript
GET /api/agent/historical-orders?minVolume=1000&maxVolume=3000
```

### AI Servisi Özellikleri

**OpenRouterService** sınıfı şu fonksiyonları sağlar:

- `chat()`: Claude ile doğrudan sohbet
- `estimateTankPrice()`: Tank özelliklerine göre fiyat tahmini
- `analyzeHistoricalOrders()`: Geçmiş sipariş analizi
- `calculatePriceStatistics()`: İstatistiksel fiyat hesaplama

### Fiyat Hesaplama Mantığı

```typescript
Base Price = Ortalama benzer sipariş fiyatı
+ İzolasyon: +15%
+ Karıştırıcı: +10%
+ Ceket/Serpantin: +12%
+ Yüksek Basınç (>5 bar): +8%
+ Yüksek Sıcaklık (>100°C): +5%
```

## Güvenlik

- API key'iniz `.env` dosyasında saklanır
- `.env` dosyası `.gitignore`'da olduğundan Git'e yüklenmez
- API key backend'de kalır, frontend'e gönderilmez
- OpenRouter üzerinden şifreli iletişim (HTTPS)

## Maliyet

OpenRouter, kullandığınız token sayısına göre ücretlendirme yapar:
- Claude Sonnet 4.5: ~$3 / 1M token (input)
- Her mesaj ortalama 500-2000 token kullanır
- Chat arayüzünde kullanılan token sayısı gösterilir

## Sorun Giderme

### "OpenRouter API key not configured" Hatası

**Çözüm**: `.env` dosyasında `OPENROUTER_API_KEY` değişkenini kontrol edin

### "Failed to process chat request" Hatası

**Olası Nedenler**:
1. API key geçersiz
2. OpenRouter bakiyesi yetersiz
3. İnternet bağlantısı sorunu

**Çözüm**: API key'inizi OpenRouter dashboard'dan kontrol edin

### Token Limiti Hatası

**Çözüm**: Sohbet geçmişini "Sohbeti Temizle" butonu ile temizleyin

## Geliştirme

### Yeni Özellikler Eklemek

1. `server/openrouter-service.ts` - AI servis mantığı
2. `server/routes.ts` - API endpoint'leri
3. `client/src/pages/chat.tsx` - Frontend arayüzü

### Model Değiştirme

`server/openrouter-service.ts` dosyasında model değişkeni:

```typescript
private model = "anthropic/claude-3.5-sonnet"; // veya başka bir model
```

Kullanılabilir modeller:
- `anthropic/claude-3.5-sonnet` (önerilen)
- `anthropic/claude-3-opus`
- `openai/gpt-4-turbo`
- `google/gemini-pro`

## Destek

Sorun yaşarsanız:
1. Console logları kontrol edin (F12 > Console)
2. Network sekmesinden API çağrılarını inceleyin
3. `.env` dosyasını kontrol edin
4. Sunucuyu yeniden başlatın

---

**Not**: Bu özellik PostgreSQL veritabanındaki geçmiş siparişleri kullanır. Daha fazla sipariş verisi = Daha iyi tahminler! 🚀
