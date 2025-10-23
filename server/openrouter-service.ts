import { db } from "./db";
import { tankOrder, costItem, materialQuality, materialTypeDict, uomUnit } from "@shared/schema";
import { sql, desc, asc } from "drizzle-orm";

// OpenRouter AI Service for Tank Cost Analysis
export class OpenRouterService {
  private apiKey: string;
  private baseUrl = "https://openrouter.ai/api/v1";
  private model = "anthropic/claude-sonnet-4.5"; // Claude Sonnet 4.5

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Analyze historical tank orders to provide pricing insights
   */
  async analyzeHistoricalOrders(filters?: {
    minDiameter?: number;
    maxDiameter?: number;
    minVolume?: number;
    maxVolume?: number;
    materialGrade?: string;
  }): Promise<any[]> {
    try {
      let query = db
        .select({
          id: tankOrder.id,
          orderCode: tankOrder.order_code,
          customerName: tankOrder.customer_name,
          diameterMm: tankOrder.diameter_mm,
          lengthMm: tankOrder.length_mm,
          volume: tankOrder.volume,
          materialGrade: tankOrder.material_grade,
          totalPriceEur: tankOrder.total_price_eur,
          totalWeightKg: tankOrder.total_weight_kg,
          createdDate: tankOrder.created_date,
        })
        .from(tankOrder)
        .orderBy(desc(tankOrder.created_date))
        .limit(100);

      const orders = await query;

      // Apply filters if provided
      let filteredOrders = orders;
      if (filters) {
        filteredOrders = orders.filter(order => {
          if (filters.minDiameter && Number(order.diameterMm) < filters.minDiameter) return false;
          if (filters.maxDiameter && Number(order.diameterMm) > filters.maxDiameter) return false;
          if (filters.minVolume && Number(order.volume) < filters.minVolume) return false;
          if (filters.maxVolume && Number(order.volume) > filters.maxVolume) return false;
          if (filters.materialGrade && order.materialGrade !== filters.materialGrade) return false;
          return true;
        });
      }

      return filteredOrders;
    } catch (error) {
      console.error("Error analyzing historical orders:", error);
      throw error;
    }
  }

  /**
   * Get cost breakdown for a specific order
   */
  async getOrderCostBreakdown(orderId: string): Promise<any> {
    try {
      const items = await db
        .select({
          id: costItem.id,
          factorName: costItem.factor_name,
          quantity: costItem.quantity,
          totalQty: costItem.total_qty,
          unitPriceEur: costItem.unit_price_eur,
          lineTotalEur: costItem.line_total_eur,
          materialQuality: materialQuality.name,
          materialType: materialTypeDict.name,
          unit: uomUnit.code,
        })
        .from(costItem)
        .leftJoin(materialQuality, sql`${costItem.material_quality_id} = ${materialQuality.id}`)
        .leftJoin(materialTypeDict, sql`${costItem.material_type_id} = ${materialTypeDict.id}`)
        .leftJoin(uomUnit, sql`${costItem.unit_id} = ${uomUnit.id}`)
        .where(sql`${costItem.order_id} = ${orderId}`)
        .orderBy(asc(costItem.line_no));

      return items;
    } catch (error) {
      console.error("Error getting order cost breakdown:", error);
      throw error;
    }
  }

  /**
   * Calculate price statistics from historical data
   */
  async calculatePriceStatistics(specs: {
    diameter?: number;
    volume?: number;
    materialGrade?: string;
  }): Promise<{
    averagePrice: number;
    minPrice: number;
    maxPrice: number;
    sampleCount: number;
    pricePerM3: number;
  }> {
    try {
      const orders = await this.analyzeHistoricalOrders({
        minDiameter: specs.diameter ? specs.diameter * 0.8 : undefined,
        maxDiameter: specs.diameter ? specs.diameter * 1.2 : undefined,
        minVolume: specs.volume ? specs.volume * 0.8 : undefined,
        maxVolume: specs.volume ? specs.volume * 1.2 : undefined,
        materialGrade: specs.materialGrade,
      });

      if (orders.length === 0) {
        return {
          averagePrice: 0,
          minPrice: 0,
          maxPrice: 0,
          sampleCount: 0,
          pricePerM3: 0,
        };
      }

      const prices = orders
        .filter(o => o.totalPriceEur)
        .map(o => Number(o.totalPriceEur));

      const volumes = orders
        .filter(o => o.volume && o.totalPriceEur)
        .map(o => ({
          volume: Number(o.volume),
          price: Number(o.totalPriceEur),
        }));

      const averagePrice = prices.reduce((a, b) => a + b, 0) / prices.length;
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);

      const avgPricePerM3 = volumes.length > 0
        ? volumes.reduce((sum, item) => sum + (item.price / item.volume), 0) / volumes.length
        : 0;

      return {
        averagePrice: Math.round(averagePrice * 100) / 100,
        minPrice: Math.round(minPrice * 100) / 100,
        maxPrice: Math.round(maxPrice * 100) / 100,
        sampleCount: orders.length,
        pricePerM3: Math.round(avgPricePerM3 * 100) / 100,
      };
    } catch (error) {
      console.error("Error calculating price statistics:", error);
      throw error;
    }
  }

  /**
   * Send chat message to Claude via OpenRouter
   */
  async chat(message: string, context?: any): Promise<{
    response: string;
    tokens: number;
  }> {
    try {
      // Prepare context with historical data
      const historicalData = await this.analyzeHistoricalOrders();
      
      // Get recent orders summary for context
      const recentOrders = historicalData.slice(0, 10).map(order => ({
        kod: order.orderCode,
        musteri: order.customerName,
        cap_mm: order.diameterMm,
        uzunluk_mm: order.lengthMm,
        hacim_m3: order.volume,
        malzeme: order.materialGrade,
        fiyat_eur: order.totalPriceEur,
        agirlik_kg: order.totalWeightKg,
        tarih: order.createdDate
      }));

      // Get price statistics
      const stats = await this.calculatePriceStatistics({});

      const databaseContext = `
DATABASE BİLGİLERİ (GERÇEK VERİLER):

TOPLAM SİPARİŞ SAYISI: ${historicalData.length} adet

FİYAT İSTATİSTİKLERİ:
- Ortalama fiyat: ${stats.averagePrice} EUR
- Minimum fiyat: ${stats.minPrice} EUR
- Maximum fiyat: ${stats.maxPrice} EUR
- m³ başına ortalama fiyat: ${stats.pricePerM3} EUR/m³

SON 10 SİPARİŞ:
${recentOrders.map((o, i) => `
${i + 1}. ${o.kod}
   Müşteri: ${o.musteri}
   Çap: ${o.cap_mm} mm
   Uzunluk: ${o.uzunluk_mm} mm
   Hacim: ${o.hacim_m3} m³
   Malzeme: ${o.malzeme}
   Fiyat: ${o.fiyat_eur} EUR
   Ağırlık: ${o.agirlik_kg} kg
   Tarih: ${o.tarih}
`).join('')}

Bu veriler gerçek sipariş kayıtlarından gelir. Fiyat tahminlerinde MUTLAKA bu verileri kullan.
`;

      const systemPrompt = `Sen Vespro Tank Maliyet Analiz Uzmanısın. Türkiye'deki tank üretim sektöründe deneyimli bir mühendissin.

GÖREV:
1. Kullanıcıların sorularını database'deki GERÇEK verilerle cevapla
2. Fiyat tahminlerinde MUTLAKA database'deki benzer siparişleri referans al
3. Tank özellikleri hakkında teknik bilgi ver
4. Maliyet optimizasyonu için önerilerde bulun

ÖNEMLİ KURALLAR:
- Her zaman database'deki GERÇEK verileri kullan
- Fiyat tahmini yaparken benzer tank örneklerini göster
- Tahminlerini database istatistiklerine dayandır
- Somut sayılar ve örneklerle yanıt ver
- Türkçe konuş

${databaseContext}

Kullanıcı sorularını bu verilerle yanıtla. Eğer spesifik bir tank soruyorsa, benzer tank örneklerini database'den göster ve fiyatını tahmin et.`;

      // Build message array with previous context
      const messages: any[] = [
        {
          role: "system",
          content: systemPrompt,
        }
      ];

      // Add previous messages if provided
      if (context?.previousMessages && Array.isArray(context.previousMessages)) {
        context.previousMessages.forEach((msg: any) => {
          if (msg.role && msg.content) {
            messages.push({
              role: msg.role,
              content: msg.content
            });
          }
        });
      }

      // Add current user message
      messages.push({
        role: "user",
        content: message,
      });

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://vespro.app",
          "X-Title": "Vespro Tank Cost Analyzer",
        },
        body: JSON.stringify({
          model: this.model,
          messages: messages,
          temperature: 0.7,
          max_tokens: 2000,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`OpenRouter API error: ${JSON.stringify(errorData)}`);
      }

      const data = await response.json();
      
      return {
        response: data.choices[0].message.content,
        tokens: data.usage.total_tokens,
      };
    } catch (error) {
      console.error("Error calling OpenRouter API:", error);
      throw error;
    }
  }

  /**
   * Estimate tank price based on specifications
   */
  async estimateTankPrice(specs: {
    diameter?: number;
    height?: number;
    volume?: number;
    materialGrade?: string;
    pressure?: number;
    temperature?: number;
    insulation?: boolean;
    mixer?: boolean;
    jacket?: boolean;
  }): Promise<{
    estimatedPrice: number;
    priceRange: { min: number; max: number };
    breakdown: any;
    confidence: number;
    similarOrders: any[];
  }> {
    try {
      // Calculate statistics from similar orders
      const stats = await this.calculatePriceStatistics({
        diameter: specs.diameter,
        volume: specs.volume,
        materialGrade: specs.materialGrade,
      });

      // Get similar orders for reference
      const similarOrders = await this.analyzeHistoricalOrders({
        minDiameter: specs.diameter ? specs.diameter * 0.9 : undefined,
        maxDiameter: specs.diameter ? specs.diameter * 1.1 : undefined,
        minVolume: specs.volume ? specs.volume * 0.9 : undefined,
        maxVolume: specs.volume ? specs.volume * 1.1 : undefined,
        materialGrade: specs.materialGrade,
      });

      // Base price calculation
      let basePrice = stats.averagePrice || (stats.pricePerM3 * (specs.volume || 0));

      // Apply modifiers for special features
      if (specs.insulation) basePrice *= 1.15; // +15% for insulation
      if (specs.mixer) basePrice *= 1.10; // +10% for mixer
      if (specs.jacket) basePrice *= 1.12; // +12% for jacket/coil
      if (specs.pressure && specs.pressure > 5) basePrice *= 1.08; // +8% for high pressure
      if (specs.temperature && specs.temperature > 100) basePrice *= 1.05; // +5% for high temp

      // Calculate confidence based on sample count
      const confidence = Math.min(0.95, stats.sampleCount / 20);

      return {
        estimatedPrice: Math.round(basePrice * 100) / 100,
        priceRange: {
          min: Math.round(basePrice * 0.85 * 100) / 100,
          max: Math.round(basePrice * 1.15 * 100) / 100,
        },
        breakdown: {
          basePrice: Math.round(stats.averagePrice * 100) / 100,
          pricePerM3: stats.pricePerM3,
          modifiers: {
            insulation: specs.insulation ? "+15%" : "0%",
            mixer: specs.mixer ? "+10%" : "0%",
            jacket: specs.jacket ? "+12%" : "0%",
            pressure: specs.pressure && specs.pressure > 5 ? "+8%" : "0%",
            temperature: specs.temperature && specs.temperature > 100 ? "+5%" : "0%",
          },
        },
        confidence,
        similarOrders: similarOrders.slice(0, 5).map(o => ({
          orderCode: o.orderCode,
          diameter: o.diameterMm,
          volume: o.volume,
          price: o.totalPriceEur,
          materialGrade: o.materialGrade,
        })),
      };
    } catch (error) {
      console.error("Error estimating tank price:", error);
      throw error;
    }
  }
}
