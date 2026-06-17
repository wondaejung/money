import type { Market } from "@/types/market";
import type { PortfolioInput } from "@/types/portfolio";

export function toKrYahooSymbol(
  symbol: string,
  exchangeType?: string,
): string {
  const digits = symbol.replace(/\D/g, "").padStart(6, "0");
  const normalized = (exchangeType ?? "").toUpperCase();

  if (normalized === "KOSDAQ" || normalized === "KQ") {
    return `${digits}.KQ`;
  }

  return `${digits}.KS`;
}

export function toYahooSymbol(symbol: string, market: Market): string {
  const trimmed = symbol.trim().toUpperCase();

  if (market === "US") return trimmed;

  return toKrYahooSymbol(trimmed);
}

export function detectMarket(_symbol: string): Market {
  return "KR";
}

export function getCurrency(market: Market): "KRW" | "USD" {
  return market === "KR" ? "KRW" : "USD";
}

export function normalizeSymbolInput(symbol: string, market: Market): string {
  const trimmed = symbol.trim().toUpperCase();
  if (market === "KR") {
    return trimmed.replace(/\D/g, "").padStart(6, "0");
  }
  return trimmed;
}

export function toPortfolioInput(
  symbol: string,
  market: Market,
  shares: number,
  purchasePrice: number,
  name = "",
): PortfolioInput {
  const normalized = normalizeSymbolInput(symbol, market);

  return {
    symbol: normalized,
    name,
    market,
    currency: getCurrency(market),
    yahooSymbol: toYahooSymbol(normalized, market),
    shares,
    purchasePrice,
  };
}
