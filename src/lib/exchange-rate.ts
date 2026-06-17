import { fetchYahooQuote } from "@/lib/yahoo-finance";

const MIN_USD_KRW = 900;
const MAX_USD_KRW = 2000;
const FALLBACK_USD_TO_KRW = 1380;

export interface ExchangeRateInfo {
  usdToKrw: number;
  source: "yahoo" | "fallback";
  yahooSymbol: string;
  fetchedAt: string;
  isValid: boolean;
}

export function normalizeUsdKrwRate(price: number): number | null {
  if (price >= MIN_USD_KRW && price <= MAX_USD_KRW) {
    return price;
  }

  if (price > 0 && price < 1) {
    const inverted = 1 / price;
    if (inverted >= MIN_USD_KRW && inverted <= MAX_USD_KRW) {
      return inverted;
    }
  }

  return null;
}

export async function fetchUsdKrwRate(): Promise<ExchangeRateInfo> {
  const fetchedAt = new Date().toISOString();

  const quote = await fetchYahooQuote("KRW=X", { cache: "no-store" });
  const normalized = quote ? normalizeUsdKrwRate(quote.price) : null;

  if (normalized) {
    return {
      usdToKrw: normalized,
      source: "yahoo",
      yahooSymbol: "KRW=X",
      fetchedAt,
      isValid: true,
    };
  }

  return {
    usdToKrw: FALLBACK_USD_TO_KRW,
    source: "fallback",
    yahooSymbol: "KRW=X",
    fetchedAt,
    isValid: false,
  };
}

export function convertToKrw(
  amount: number,
  currency: "KRW" | "USD",
  usdToKrw: number,
): number {
  return currency === "USD" ? amount * usdToKrw : amount;
}
