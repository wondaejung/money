import type { YahooQuote } from "@/types/quote";

const NAVER_USER_AGENT = "Mozilla/5.0 (compatible; StockDashboard/1.0)";
const NAVER_FETCH_TIMEOUT_MS = 5_000;

async function naverFetch(url: string, init?: RequestInit): Promise<Response> {
  return fetch(url, {
    ...init,
    headers: {
      "User-Agent": NAVER_USER_AGENT,
      ...init?.headers,
    },
    cache: init?.cache ?? "no-store",
    signal: init?.signal ?? AbortSignal.timeout(NAVER_FETCH_TIMEOUT_MS),
  });
}

interface NaverPriceDirection {
  code: string;
}

interface NaverOverMarketInfo {
  tradingSessionType?: string;
  overMarketStatus?: string;
  overPrice?: string;
  compareToPreviousClosePrice?: string;
  compareToPreviousPrice?: NaverPriceDirection;
  fluctuationsRatio?: string;
  localTradedAt?: string;
}

interface NaverBasicResponse {
  stockName?: string;
  closePrice?: string;
  compareToPreviousClosePrice?: string;
  compareToPreviousPrice?: NaverPriceDirection;
  fluctuationsRatio?: string;
  marketStatus?: string;
  localTradedAt?: string;
  overMarketPriceInfo?: NaverOverMarketInfo;
}

export interface NaverAfterHoursQuote {
  symbol: string;
  name: string;
  regularClosePrice: number;
  afterHoursClosePrice: number;
  afterHoursChangePercent: number;
  regularChangePercent: number;
  hasAfterHoursTrade: boolean;
}

export interface NaverScannerQuote extends NaverAfterHoursQuote {
  tradingValueKrw: number;
  tradingValueLabel: string;
}

export interface NaverIndexQuote {
  symbol: string;
  name: string;
  changePercent: number;
  closePrice: number;
}

export interface NaverDayOhlc {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

function parseKrwPrice(value: string): number {
  return Number(value.replace(/,/g, ""));
}

function signedChange(amount: string, direction?: NaverPriceDirection): number {
  const absolute = parseKrwPrice(amount);
  if (direction?.code === "5") return -absolute;
  return absolute;
}

function shouldUseOverMarketPrice(data: NaverBasicResponse): boolean {
  const over = data.overMarketPriceInfo;
  if (!over?.overPrice) return false;
  if (data.marketStatus === "OPEN") return false;

  const regularPrice = parseKrwPrice(data.closePrice ?? "0");
  const overPrice = parseKrwPrice(over.overPrice);

  if (over.overMarketStatus === "OPEN") return true;

  if (over.localTradedAt && data.localTradedAt) {
    return over.localTradedAt >= data.localTradedAt && overPrice !== regularPrice;
  }

  return overPrice !== regularPrice;
}

function findTotalInfoValue(
  totalInfos: Array<{ code?: string; value?: string }> | undefined,
  code: string,
): string | undefined {
  return totalInfos?.find((item) => item.code === code)?.value;
}

function parseMetricValue(value: string | undefined): number | null {
  if (!value || value === "N/A" || value === "-") return null;
  const normalized = value.replace(/,/g, "").replace(/[^\d.-]/g, "").trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function computeRoeFromEpsBps(
  eps: number | null,
  bps: number | null,
): number | null {
  if (eps == null || bps == null || bps <= 0) return null;
  return (eps / bps) * 100;
}

export interface NaverKrIntegrationMetrics {
  name: string;
  currentPrice: number;
  changePercent: number;
  per: number | null;
  pbr: number | null;
  roe: number | null;
  sectorAvgPer: number | null;
  marketCapKrw: number | null;
}

export async function fetchNaverKrFundamentals(
  symbolCode: string,
): Promise<{
  per: number | null;
  pbr: number | null;
  roe: number | null;
  sectorAvgPer: number | null;
  marketCapKrw: number | null;
  name: string | null;
} | null> {
  const code = symbolCode.replace(/\D/g, "").padStart(6, "0").slice(-6);
  const url = `https://m.stock.naver.com/api/stock/${code}/integration`;

  try {
    const integrationResponse = await naverFetch(url);
    if (!integrationResponse.ok) return null;

    const integration = (await integrationResponse.json()) as {
      stockName?: string;
      totalInfos?: Array<{ code?: string; value?: string }>;
    };

    const infos = integration.totalInfos;
    const per =
      parseMetricValue(findTotalInfoValue(infos, "per")) ??
      parseMetricValue(findTotalInfoValue(infos, "forwardPer")) ??
      parseMetricValue(findTotalInfoValue(infos, "cnsPer"));
    const pbr = parseMetricValue(findTotalInfoValue(infos, "pbr"));
    const eps =
      parseMetricValue(findTotalInfoValue(infos, "eps")) ??
      parseMetricValue(findTotalInfoValue(infos, "cnsEps"));
    const bps = parseMetricValue(findTotalInfoValue(infos, "bps"));
    const roe =
      parseMetricValue(findTotalInfoValue(infos, "roe")) ??
      computeRoeFromEpsBps(eps, bps);
    const sectorAvgPer =
      parseMetricValue(findTotalInfoValue(infos, "industryPer")) ??
      parseMetricValue(findTotalInfoValue(infos, "sectorPer")) ??
      parseMetricValue(findTotalInfoValue(infos, "industryAveragePer"));
    const marketCapLabel = findTotalInfoValue(infos, "marketValue");
    const marketCapKrw = marketCapLabel
      ? parseTradingValue(marketCapLabel)
      : null;

    return {
      name: integration.stockName ?? null,
      per,
      pbr,
      roe,
      sectorAvgPer,
      marketCapKrw,
    };
  } catch {
    return null;
  }
}

export async function fetchNaverKrIntegrationMetrics(
  symbolCode: string,
): Promise<NaverKrIntegrationMetrics | null> {
  const [basic, fundamentals] = await Promise.all([
    fetchNaverKrQuote(symbolCode),
    fetchNaverKrFundamentals(symbolCode),
  ]);

  if (!basic) return null;

  if (!fundamentals) {
    return {
      name: basic.name ?? symbolCode,
      currentPrice: basic.price,
      changePercent: basic.changePercent,
      per: null,
      pbr: null,
      roe: null,
      sectorAvgPer: null,
      marketCapKrw: null,
    };
  }

  return {
    name: fundamentals.name ?? basic.name ?? symbolCode,
    currentPrice: basic.price,
    changePercent: basic.changePercent,
    per: fundamentals.per,
    pbr: fundamentals.pbr,
    roe: fundamentals.roe,
    sectorAvgPer: fundamentals.sectorAvgPer,
    marketCapKrw: fundamentals.marketCapKrw,
  };
}

export async function fetchNaverUsdKrwRate(): Promise<number | null> {
  const endpoints = [
    "https://m.stock.naver.com/front-api/marketIndex/exchange/FX_USDKRW/basic",
    "https://m.stock.naver.com/api/marketindex/exchange/FX_USDKRW/basic",
  ];

  for (const url of endpoints) {
    try {
      const response = await naverFetch(url);

      if (!response.ok) continue;

      const data = (await response.json()) as {
        closePrice?: string;
        saleBaseRate?: string;
        basePrice?: string;
      };

      const raw =
        data.closePrice ?? data.saleBaseRate ?? data.basePrice ?? null;
      if (!raw) continue;

      const rate = parseKrwPrice(raw);
      if (rate >= 900 && rate <= 2000) return rate;
    } catch {
      // try next endpoint
    }
  }

  return null;
}

export async function fetchNaverKrQuote(
  symbolCode: string,
): Promise<YahooQuote | null> {
  const code = symbolCode.replace(/\D/g, "").padStart(6, "0").slice(-6);
  const url = `https://m.stock.naver.com/api/stock/${code}/basic`;

  try {
    const response = await naverFetch(url);

    if (!response.ok) return null;

    const data = (await response.json()) as NaverBasicResponse;
    if (!data.closePrice || !data.stockName) return null;

    const regularPrice = parseKrwPrice(data.closePrice);
    const regularChange = signedChange(
      data.compareToPreviousClosePrice ?? "0",
      data.compareToPreviousPrice,
    );
    const regularPreviousClose = regularPrice - regularChange;

    if (shouldUseOverMarketPrice(data)) {
      const over = data.overMarketPriceInfo!;
      const price = parseKrwPrice(over.overPrice!);
      const overChange = signedChange(
        over.compareToPreviousClosePrice ?? "0",
        over.compareToPreviousPrice,
      );

      return {
        symbol: code,
        price,
        previousClose: price - overChange,
        changePercent: Number(over.fluctuationsRatio ?? "0"),
        currency: "KRW",
        name: data.stockName,
      };
    }

    return {
      symbol: code,
      price: regularPrice,
      previousClose: regularPreviousClose,
      changePercent: Number(data.fluctuationsRatio ?? "0"),
      currency: "KRW",
      name: data.stockName,
    };
  } catch {
    return null;
  }
}

export async function fetchNaverAfterHoursQuote(
  symbolCode: string,
): Promise<NaverAfterHoursQuote | null> {
  const code = symbolCode.replace(/\D/g, "").padStart(6, "0").slice(-6);
  const url = `https://m.stock.naver.com/api/stock/${code}/basic`;

  try {
    const response = await naverFetch(url);

    if (!response.ok) return null;

    const data = (await response.json()) as NaverBasicResponse;
    if (!data.closePrice || !data.stockName) return null;

    const regularClosePrice = parseKrwPrice(data.closePrice);
    const over = data.overMarketPriceInfo;
    const afterHoursClosePrice = over?.overPrice
      ? parseKrwPrice(over.overPrice)
      : regularClosePrice;

    const hasAfterHoursTrade =
      Boolean(over?.overPrice) && afterHoursClosePrice !== regularClosePrice;

    const afterHoursChangePercent =
      regularClosePrice > 0
        ? ((afterHoursClosePrice - regularClosePrice) / regularClosePrice) * 100
        : 0;

    return {
      symbol: code,
      name: data.stockName,
      regularClosePrice,
      afterHoursClosePrice,
      afterHoursChangePercent,
      regularChangePercent: Number(data.fluctuationsRatio ?? "0"),
      hasAfterHoursTrade,
    };
  } catch {
    return null;
  }
}

export async function fetchNaverDayOhlc(
  symbolCode: string,
  dateYmd: string,
): Promise<NaverDayOhlc | null> {
  const code = symbolCode.replace(/\D/g, "").padStart(6, "0").slice(-6);
  const url = `https://m.stock.naver.com/api/stock/${code}/price`;

  try {
    const response = await naverFetch(url);

    if (!response.ok) return null;

    const rows = (await response.json()) as Array<{
      localTradedAt?: string;
      openPrice?: string;
      highPrice?: string;
      lowPrice?: string;
      closePrice?: string;
    }>;

    const row = rows.find((item) => item.localTradedAt === dateYmd);
    if (!row?.openPrice || !row.highPrice || !row.closePrice) return null;

    return {
      date: dateYmd,
      open: parseKrwPrice(row.openPrice),
      high: parseKrwPrice(row.highPrice),
      low: parseKrwPrice(row.lowPrice ?? row.closePrice),
      close: parseKrwPrice(row.closePrice),
    };
  } catch {
    return null;
  }
}

function parseTradingValue(value: string): number {
  const normalized = value.replace(/,/g, "").trim();
  if (normalized.includes("백만")) {
    return Number(normalized.replace("백만", "")) * 1_000_000;
  }
  if (normalized.includes("조")) {
    const [joPart, rest = "0"] = normalized.split("조");
    const jo = Number(joPart.replace(/[^\d.]/g, "")) || 0;
    const eok = Number(rest.replace(/[^\d.]/g, "")) || 0;
    return jo * 1_0000_0000_0000 + eok * 100_000_000;
  }
  if (normalized.includes("억")) {
    return Number(normalized.replace(/[^\d.]/g, "")) * 100_000_000;
  }
  return Number(normalized.replace(/[^\d.]/g, "")) || 0;
}

async function fetchNaverIntegrationTradingValue(
  symbolCode: string,
): Promise<{ tradingValueKrw: number; tradingValueLabel: string } | null> {
  const code = symbolCode.replace(/\D/g, "").padStart(6, "0").slice(-6);
  const url = `https://m.stock.naver.com/api/stock/${code}/integration`;

  try {
    const response = await naverFetch(url);

    if (!response.ok) return null;

    const data = (await response.json()) as {
      totalInfos?: Array<{ code?: string; value?: string }>;
    };

    const tradingValue = data.totalInfos?.find(
      (item) => item.code === "accumulatedTradingValue",
    );

    if (!tradingValue?.value) return null;

    return {
      tradingValueKrw: parseTradingValue(tradingValue.value),
      tradingValueLabel: tradingValue.value,
    };
  } catch {
    return null;
  }
}

export async function fetchNaverIndexQuote(
  indexCode: "KOSPI" | "KOSDAQ",
): Promise<NaverIndexQuote | null> {
  const url = `https://m.stock.naver.com/api/index/${indexCode}/basic`;

  try {
    const response = await naverFetch(url);

    if (!response.ok) return null;

    const data = (await response.json()) as {
      stockName?: string;
      closePrice?: string;
      fluctuationsRatio?: string;
    };

    if (!data.closePrice || !data.stockName) return null;

    return {
      symbol: indexCode,
      name: data.stockName,
      changePercent: Number(data.fluctuationsRatio ?? "0"),
      closePrice: parseKrwPrice(data.closePrice),
    };
  } catch {
    return null;
  }
}

export async function fetchNaverScannerQuote(
  symbolCode: string,
): Promise<NaverScannerQuote | null> {
  const [afterHours, trading] = await Promise.all([
    fetchNaverAfterHoursQuote(symbolCode),
    fetchNaverIntegrationTradingValue(symbolCode),
  ]);

  if (!afterHours) return null;

  return {
    ...afterHours,
    tradingValueKrw: trading?.tradingValueKrw ?? 0,
    tradingValueLabel: trading?.tradingValueLabel ?? "—",
  };
}

export async function fetchNaverScannerQuotes(
  symbols: string[],
): Promise<NaverScannerQuote[]> {
  const results = await Promise.all(
    symbols.map((symbol) => fetchNaverScannerQuote(symbol)),
  );

  return results.filter((quote): quote is NaverScannerQuote => quote !== null);
}

export async function fetchNaverAfterHoursQuotes(
  symbols: string[],
): Promise<NaverAfterHoursQuote[]> {
  const results = await Promise.all(
    symbols.map((symbol) => fetchNaverAfterHoursQuote(symbol)),
  );

  return results.filter(
    (quote): quote is NaverAfterHoursQuote => quote !== null,
  );
}
