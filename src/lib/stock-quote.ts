import { fetchNaverKrQuote } from "@/lib/naver-finance";
import { fetchYahooQuote } from "@/lib/yahoo-finance";
import type { Market } from "@/types/market";
import type { YahooQuote } from "@/types/quote";

function krSymbolFromYahoo(yahooSymbol: string): string {
  return yahooSymbol.replace(/\.(KS|KQ)$/i, "");
}

export async function fetchKrExchangeType(
  symbolCode: string,
): Promise<".KS" | ".KQ" | null> {
  const code = symbolCode.replace(/\D/g, "").padStart(6, "0").slice(-6);
  const url = `https://m.stock.naver.com/api/stock/${code}/basic`;

  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; StockDashboard/1.0)" },
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });

    if (!response.ok) return null;

    const data = (await response.json()) as {
      stockExchangeType?: { code?: string };
    };

    const exchangeCode = data.stockExchangeType?.code?.toUpperCase();
    if (exchangeCode === "KQ") return ".KQ";
    if (exchangeCode === "KS") return ".KS";
    return null;
  } catch {
    return null;
  }
}

export async function resolveKrYahooSymbol(
  symbolCode: string,
): Promise<string> {
  const code = symbolCode.replace(/\D/g, "").padStart(6, "0").slice(-6);
  const suffix = (await fetchKrExchangeType(code)) ?? ".KS";
  return `${code}${suffix}`;
}

export async function fetchStockQuote(
  yahooSymbol: string,
  market: Market,
  options?: { cache?: RequestCache },
): Promise<YahooQuote | null> {
  if (market === "KR") {
    const naverQuote = await fetchNaverKrQuote(krSymbolFromYahoo(yahooSymbol));
    if (naverQuote) {
      return { ...naverQuote, symbol: yahooSymbol };
    }
    return null;
  }

  return fetchYahooQuote(yahooSymbol, options);
}

export async function fetchStockQuotes(
  items: Array<{ yahooSymbol: string; market: Market }>,
): Promise<Map<string, YahooQuote>> {
  const results = await Promise.all(
    items.map(async (item) => {
      const quote = await fetchStockQuote(item.yahooSymbol, item.market, {
        cache: "no-store",
      });
      return [item.yahooSymbol, quote] as const;
    }),
  );

  const quoteMap = new Map<string, YahooQuote>();
  for (const [symbol, quote] of results) {
    if (quote) quoteMap.set(symbol, quote);
  }

  return quoteMap;
}
