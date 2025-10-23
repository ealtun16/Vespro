/**
 * Exchange Rate Service
 * Fetches live currency exchange rates from Frankfurter API
 * Based on European Central Bank data - free and unlimited
 */

interface ExchangeRateResponse {
  amount: number;
  base: string;
  date: string;
  rates: {
    EUR?: number;
    TRY?: number;
  };
}

interface ExchangeRates {
  usdToEur: number;
  usdToTry: number;
  lastUpdated: Date;
}

export class ExchangeRateService {
  private static readonly API_URL = 'https://api.frankfurter.app/latest';
  private static readonly BASE_CURRENCY = 'USD';
  private static readonly TARGET_CURRENCIES = 'EUR,TRY';

  /**
   * Fetch latest exchange rates from Frankfurter API
   * @returns Exchange rates object with USD as base currency
   */
  static async fetchLatestRates(): Promise<ExchangeRates> {
    try {
      const url = `${this.API_URL}?from=${this.BASE_CURRENCY}&to=${this.TARGET_CURRENCIES}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Exchange rate API returned status ${response.status}`);
      }

      const data: ExchangeRateResponse = await response.json();

      // Validate response
      if (!data.rates || !data.rates.EUR || !data.rates.TRY) {
        throw new Error('Invalid exchange rate response: missing rates');
      }

      return {
        usdToEur: data.rates.EUR,
        usdToTry: data.rates.TRY,
        lastUpdated: new Date(),
      };
    } catch (error) {
      console.error('Error fetching exchange rates:', error);
      throw new Error('Failed to fetch exchange rates from external API');
    }
  }

  /**
   * Calculate EUR to USD rate from USD to EUR rate
   * @param usdToEur USD to EUR rate
   * @returns EUR to USD rate
   */
  static calculateEurToUsd(usdToEur: number): number {
    return 1 / usdToEur;
  }

  /**
   * Validate exchange rate value
   * @param rate Exchange rate to validate
   * @returns True if valid
   */
  static isValidRate(rate: number): boolean {
    return typeof rate === 'number' && 
           !isNaN(rate) && 
           isFinite(rate) && 
           rate > 0;
  }
}
