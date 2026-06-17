import type { Market } from "@/types/market";
import {
  aliasToSearchResult,
  searchKrAliases,
} from "@/data/kr-stock-aliases";
import { searchNaverKrStockResults } from "@/lib/naver-search";
import { fetchStockQuote } from "@/lib/stock-quote";

export interface StockSearchResult {
  symbol: string;
  name: string;
  market: Market;
  currency: "KRW" | "USD";
  yahooSymbol: string;
  exchange: string;
}

function dedupeResults(results: StockSearchResult[]): StockSearchResult[] {
  const seen = new Set<string>();
  return results.filter((item) => {
    if (seen.has(item.yahooSymbol)) return false;
    seen.add(item.yahooSymbol);
    return true;
  });
}

async function searchBySymbolCode(query: string): Promise<StockSearchResult[]> {
  const digits = query.replace(/\D/g, "");
  if (digits.length !== 6) return [];

  const symbol = digits.padStart(6, "0");
  const suffixes = [".KS", ".KQ"] as const;

  for (const suffix of suffixes) {
    const yahooSymbol = `${symbol}${suffix}`;
    const quote = await fetchStockQuote(yahooSymbol, "KR", { cache: "no-store" });
    if (!quote) continue;

    return [
      {
        symbol,
        name: quote.name,
        market: "KR",
        currency: "KRW",
        yahooSymbol,
        exchange: suffix === ".KQ" ? "KOSDAQ" : "KRX",
      },
    ];
  }

  return [];
}

export async function searchStocks(
  query: string,
  market?: Market,
): Promise<StockSearchResult[]> {
  if (market === "US") return [];

  const trimmed = query.trim();
  if (trimmed.length < 1) return [];

  const results: StockSearchResult[] = [];

  const aliasHits = searchKrAliases(trimmed);
  for (const alias of aliasHits) {
    results.push(aliasToSearchResult(alias));
  }

  const naverResults = await searchNaverKrStockResults(trimmed);
  results.push(...naverResults);

  const codeHits = await searchBySymbolCode(trimmed);
  results.push(...codeHits);

  return dedupeResults(results).filter((item) => item.market === "KR");
}
