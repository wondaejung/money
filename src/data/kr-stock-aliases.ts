export interface KrStockAlias {
  symbol: string;
  name: string;
  yahooSymbol: string;
  /** 추가 검색어 (영문명, 약어 등) */
  keywords?: string[];
}

/** Yahoo 한글/영문 검색이 불안정한 종목 — 로컬 매핑 */
export const KR_STOCK_ALIASES: KrStockAlias[] = [
  { symbol: "005935", name: "삼성전자우", yahooSymbol: "005935.KS" },
  { symbol: "005930", name: "삼성전자", yahooSymbol: "005930.KS" },
  { symbol: "000660", name: "SK하이닉스", yahooSymbol: "000660.KS" },
  { symbol: "035420", name: "NAVER", yahooSymbol: "035420.KS", keywords: ["naver"] },
  { symbol: "207940", name: "삼성바이오로직스", yahooSymbol: "207940.KS" },
  { symbol: "068270", name: "셀트리온", yahooSymbol: "068270.KS" },
  { symbol: "005380", name: "현대차", yahooSymbol: "005380.KS" },
  { symbol: "005389", name: "현대차우", yahooSymbol: "005389.KS" },
  { symbol: "000270", name: "기아", yahooSymbol: "000270.KS" },
  { symbol: "051910", name: "LG화학", yahooSymbol: "051910.KS" },
  { symbol: "006400", name: "삼성SDI", yahooSymbol: "006400.KS" },
  { symbol: "003550", name: "LG", yahooSymbol: "003550.KS" },
  { symbol: "003555", name: "LG우", yahooSymbol: "003555.KS" },
  { symbol: "035720", name: "카카오", yahooSymbol: "035720.KS" },
  { symbol: "105560", name: "KB금융", yahooSymbol: "105560.KS" },
  { symbol: "055550", name: "신한지주", yahooSymbol: "055550.KS" },
  {
    symbol: "037270",
    name: "YG플러스",
    yahooSymbol: "037270.KS",
    keywords: ["ygplus", "yg plus", "yg+", "ygp", "yg plus inc"],
  },
  {
    symbol: "041510",
    name: "SM엔터테인먼트",
    yahooSymbol: "041510.KQ",
    keywords: ["smentertainment", "sm entertainment", "sm"],
  },
  {
    symbol: "122870",
    name: "YG엔터테인먼트",
    yahooSymbol: "122870.KQ",
    keywords: ["ygentertainment", "yg entertainment"],
  },
  {
    symbol: "082740",
    name: "한화엔진",
    yahooSymbol: "082740.KS",
    keywords: ["hanwhaengine", "hanwha engine", "한화 엔진"],
  },
  {
    symbol: "458870",
    name: "씨어스",
    yahooSymbol: "458870.KQ",
    keywords: ["seers", "씨어스테크놀로지", "seers technology"],
  },
];

function normalizeSearchText(text: string): string {
  return text.trim().replace(/\s+/g, "").toLowerCase();
}

function getAliasSearchKeys(alias: KrStockAlias): string[] {
  return [alias.name, alias.symbol, ...(alias.keywords ?? [])].map(
    normalizeSearchText,
  );
}

export function searchKrAliases(query: string): KrStockAlias[] {
  const normalized = normalizeSearchText(query);
  if (!normalized) return [];

  const exact = KR_STOCK_ALIASES.filter((item) =>
    getAliasSearchKeys(item).some((key) => key === normalized),
  );

  if (exact.length > 0) return exact;

  return KR_STOCK_ALIASES.filter((item) => {
    const keys = getAliasSearchKeys(item);
    return keys.some(
      (key) => key.includes(normalized) || normalized.includes(key),
    );
  });
}

export function aliasToSearchResult(alias: KrStockAlias) {
  return {
    symbol: alias.symbol,
    name: alias.name,
    market: "KR" as const,
    currency: "KRW" as const,
    yahooSymbol: alias.yahooSymbol,
    exchange: alias.yahooSymbol.endsWith(".KQ") ? "KOSDAQ" : "KRX",
  };
}
