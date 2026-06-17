import type { StockSearchResult } from "@/lib/yahoo-search";

const NAVER_USER_AGENT = "Mozilla/5.0 (compatible; StockDashboard/1.0)";

export interface NaverSearchItem {
  code: string;
  name: string;
  typeCode: string;
  typeName: string;
}

interface NaverSearchResponse {
  isSuccess?: boolean;
  result?: {
    items?: NaverSearchItem[];
  };
}

export function naverTypeToSuffix(typeCode: string): ".KS" | ".KQ" {
  const normalized = typeCode.toUpperCase();
  if (normalized === "KOSDAQ" || normalized === "KQ") return ".KQ";
  return ".KS";
}

export function naverItemToSearchResult(item: NaverSearchItem): StockSearchResult {
  const suffix = naverTypeToSuffix(item.typeCode);

  return {
    symbol: item.code,
    name: item.name,
    market: "KR",
    currency: "KRW",
    yahooSymbol: `${item.code}${suffix}`,
    exchange: suffix === ".KQ" ? "KOSDAQ" : "KRX",
  };
}

export async function searchNaverKrStocks(
  query: string,
): Promise<NaverSearchItem[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const url = `https://m.stock.naver.com/front-api/search?q=${encodeURIComponent(trimmed)}&target=stock&size=20&page=1`;

  try {
    const response = await fetch(url, {
      headers: { "User-Agent": NAVER_USER_AGENT },
      cache: "no-store",
    });

    if (!response.ok) return [];

    const payload = (await response.json()) as NaverSearchResponse;
    return payload.result?.items ?? [];
  } catch {
    return [];
  }
}

export async function searchNaverKrStockResults(
  query: string,
): Promise<StockSearchResult[]> {
  const items = await searchNaverKrStocks(query);
  return items.map(naverItemToSearchResult);
}
