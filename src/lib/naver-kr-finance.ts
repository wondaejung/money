const NAVER_USER_AGENT = "Mozilla/5.0 (compatible; StockDashboard/1.0)";
const NAVER_FETCH_TIMEOUT_MS = 8_000;

async function naverFetch(url: string): Promise<Response> {
  return fetch(url, {
    headers: { "User-Agent": NAVER_USER_AGENT },
    cache: "no-store",
    signal: AbortSignal.timeout(NAVER_FETCH_TIMEOUT_MS),
  });
}

function normalizeTicker(symbolCode: string): string {
  return symbolCode.replace(/\D/g, "").padStart(6, "0").slice(-6);
}

interface NaverFinanceColumn {
  value?: string;
  cx?: string | null;
}

interface NaverFinanceRow {
  title?: string;
  columns?: Record<string, NaverFinanceColumn>;
}

interface NaverFinanceResponse {
  financeInfo?: {
    trTitleList?: Array<{
      title?: string;
      key?: string;
      isConsensus?: string;
    }>;
    rowList?: NaverFinanceRow[];
  };
}

export interface NaverFinancePeriod {
  key: string;
  label: string;
  isConsensus: boolean;
}

export interface NaverFinanceMetricRow {
  title: string;
  values: Record<string, string>;
}

export interface NaverKrFinanceSheet {
  periodType: "quarter" | "annual";
  periods: NaverFinancePeriod[];
  rows: NaverFinanceMetricRow[];
}

export interface NaverKrDisclosure {
  disclosureId: number;
  title: string;
  datetime: string;
  author: string;
}

function parseFinanceSheet(
  payload: NaverFinanceResponse,
  periodType: "quarter" | "annual",
): NaverKrFinanceSheet | null {
  const info = payload.financeInfo;
  if (!info?.trTitleList?.length || !info.rowList?.length) return null;

  const periods: NaverFinancePeriod[] = info.trTitleList
    .filter((period) => period.key && period.title)
    .map((period) => ({
      key: period.key!,
      label: period.title!,
      isConsensus: period.isConsensus === "Y",
    }));

  const rows: NaverFinanceMetricRow[] = info.rowList
    .filter((row) => row.title && row.columns)
    .map((row) => {
      const values: Record<string, string> = {};
      for (const [key, column] of Object.entries(row.columns ?? {})) {
        if (column?.value) values[key] = column.value;
      }
      return { title: row.title!, values };
    });

  return { periodType, periods, rows };
}

async function fetchFinanceSheet(
  ticker: string,
  periodType: "quarter" | "annual",
): Promise<NaverKrFinanceSheet | null> {
  const code = normalizeTicker(ticker);
  const url = `https://m.stock.naver.com/api/stock/${code}/finance/${periodType}`;

  try {
    const response = await naverFetch(url);
    if (!response.ok) return null;

    const payload = (await response.json()) as NaverFinanceResponse;
    return parseFinanceSheet(payload, periodType);
  } catch {
    return null;
  }
}

export async function fetchNaverKrFinanceQuarter(
  ticker: string,
): Promise<NaverKrFinanceSheet | null> {
  return fetchFinanceSheet(ticker, "quarter");
}

export async function fetchNaverKrFinanceAnnual(
  ticker: string,
): Promise<NaverKrFinanceSheet | null> {
  return fetchFinanceSheet(ticker, "annual");
}

export async function fetchNaverKrDisclosures(
  ticker: string,
  limit = 30,
): Promise<NaverKrDisclosure[]> {
  const code = normalizeTicker(ticker);
  const url = `https://m.stock.naver.com/api/stock/${code}/disclosure`;

  try {
    const response = await naverFetch(url);
    if (!response.ok) return [];

    const rows = (await response.json()) as Array<{
      disclosureId?: number;
      title?: string;
      datetime?: string;
      author?: string;
    }>;

    return rows
      .filter((row) => row.title && row.datetime)
      .slice(0, limit)
      .map((row) => ({
        disclosureId: row.disclosureId ?? 0,
        title: row.title!,
        datetime: row.datetime!,
        author: row.author ?? "DART",
      }));
  } catch {
    return [];
  }
}
