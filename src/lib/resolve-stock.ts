import {
  aliasToSearchResult,
  searchKrAliases,
} from "@/data/kr-stock-aliases";
import { fetchStockQuote, resolveKrYahooSymbol } from "@/lib/stock-quote";
import { normalizeSymbolInput } from "@/lib/symbol-utils";
import { searchStocks, type StockSearchResult } from "@/lib/yahoo-search";
import type { Market } from "@/types/market";

export interface ResolvedStock {
  symbol: string;
  name: string;
  market: Market;
  currency: "KRW" | "USD";
  yahooSymbol: string;
  currentPrice: number;
  changePercent: number;
  exchange: string;
}

function normalizeText(text: string): string {
  return text.trim().replace(/\s+/g, "").toLowerCase();
}

function scoreResult(query: string, result: StockSearchResult): number {
  const q = normalizeText(query);
  const name = normalizeText(result.name);
  const symbol = result.symbol.toLowerCase();

  if (name === q || symbol === q) return 100;
  if (name.startsWith(q) || q.startsWith(name)) return 90;
  if (name.includes(q) || q.includes(name)) return 75;
  if (symbol.includes(q)) return 60;
  return 20;
}

function pickBestMatch(
  query: string,
  results: StockSearchResult[],
): StockSearchResult | null {
  const krOnly = results.filter((item) => item.market === "KR");
  if (krOnly.length === 0) return null;

  const ranked = [...krOnly].sort(
    (a, b) => scoreResult(query, b) - scoreResult(query, a),
  );

  const best = ranked[0];
  if (scoreResult(query, best) < 20) return null;

  return best;
}

export async function resolveStockByName(
  rawName: string,
  _marketHint?: Market,
): Promise<ResolvedStock | null> {
  const query = rawName.trim();
  if (!query) return null;

  const collected: StockSearchResult[] = [];

  const aliasHits = searchKrAliases(query);
  for (const alias of aliasHits) {
    collected.push(aliasToSearchResult(alias));
  }

  if (/^\d{6}$/.test(query.replace(/\D/g, ""))) {
    const normalized = normalizeSymbolInput(query, "KR");
    const yahooSymbol = await resolveKrYahooSymbol(normalized);
    const quote = await fetchStockQuote(yahooSymbol, "KR", {
      cache: "no-store",
    });
    if (quote) {
      collected.push({
        symbol: normalized,
        name: quote.name,
        market: "KR",
        currency: "KRW",
        yahooSymbol,
        exchange: yahooSymbol.endsWith(".KQ") ? "KOSDAQ" : "KRX",
      });
    }
  }

  const marketResults = await searchStocks(query, "KR");
  collected.push(...marketResults);

  const deduped = Array.from(
    new Map(collected.map((item) => [item.yahooSymbol, item])).values(),
  );

  const best = pickBestMatch(query, deduped);
  if (!best) return null;

  const quote = await fetchStockQuote(best.yahooSymbol, "KR", {
    cache: "no-store",
  });
  if (!quote) return null;

  const aliasMatch = aliasHits.find((a) => a.yahooSymbol === best.yahooSymbol);

  return {
    symbol: best.symbol,
    name: aliasMatch?.name ?? best.name,
    market: "KR",
    currency: "KRW",
    yahooSymbol: best.yahooSymbol,
    currentPrice: quote.price,
    changePercent: quote.changePercent,
    exchange: best.exchange,
  };
}
