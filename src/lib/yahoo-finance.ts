import type { YahooQuote } from "@/types/quote";

const YAHOO_USER_AGENT = "Mozilla/5.0 (compatible; StockDashboard/1.0)";

interface YahooChartMeta {
  regularMarketPrice?: number;
  chartPreviousClose?: number;
  currency?: string;
  shortName?: string;
  longName?: string;
  symbol?: string;
}

export function calcChangePercent(price: number, previousClose: number): number {
  if (previousClose === 0) return 0;
  return ((price - previousClose) / previousClose) * 100;
}

export async function fetchYahooQuote(
  yahooSymbol: string,
  options?: { cache?: RequestCache },
): Promise<YahooQuote | null> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=1d&range=1d`;

  try {
    const response = await fetch(url, {
      headers: { "User-Agent": YAHOO_USER_AGENT },
      cache: options?.cache ?? "default",
      next: options?.cache === "no-store" ? undefined : { revalidate: 60 },
    });

    if (!response.ok) return null;

    const payload = (await response.json()) as {
      chart?: { result?: Array<{ meta?: YahooChartMeta }> };
    };

    const meta = payload.chart?.result?.[0]?.meta;
    if (!meta) return null;

    const price = meta.regularMarketPrice;
    const previousClose = meta.chartPreviousClose;

    if (typeof price !== "number" || typeof previousClose !== "number") {
      return null;
    }

    return {
      symbol: yahooSymbol,
      price,
      previousClose,
      changePercent: calcChangePercent(price, previousClose),
      currency: meta.currency ?? "USD",
      name: meta.shortName ?? meta.longName ?? yahooSymbol,
    };
  } catch {
    return null;
  }
}

export async function fetchYahooQuotes(
  yahooSymbols: string[],
): Promise<Map<string, YahooQuote>> {
  const results = await Promise.all(
    yahooSymbols.map(async (symbol) => {
      const quote = await fetchYahooQuote(symbol);
      return [symbol, quote] as const;
    }),
  );

  const quoteMap = new Map<string, YahooQuote>();

  for (const [symbol, quote] of results) {
    if (quote) quoteMap.set(symbol, quote);
  }

  return quoteMap;
}

export async function fetchIntradaySparkline(
  yahooSymbol: string,
): Promise<number[]> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=5m&range=1d`;

  try {
    const response = await fetch(url, {
      headers: { "User-Agent": YAHOO_USER_AGENT },
      cache: "no-store",
    });

    if (!response.ok) return [];

    const payload = (await response.json()) as {
      chart?: {
        result?: Array<{
          indicators?: { quote?: Array<{ close?: Array<number | null> }> };
        }>;
      };
    };

    const closes = payload.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? [];

    return closes.filter(
      (price): price is number => typeof price === "number" && price > 0,
    );
  } catch {
    return [];
  }
}

export async function fetchSparklines(
  yahooSymbols: string[],
): Promise<Map<string, number[]>> {
  const results = await Promise.all(
    yahooSymbols.map(async (symbol) => {
      const sparkline = await fetchIntradaySparkline(symbol);
      return [symbol, sparkline] as const;
    }),
  );

  const map = new Map<string, number[]>();
  for (const [symbol, sparkline] of results) {
    map.set(symbol, sparkline);
  }
  return map;
}
