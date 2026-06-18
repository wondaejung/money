import type {
  NaverKrDisclosure,
  NaverKrFinanceSheet,
  NaverFinancePeriod,
} from "@/lib/naver-kr-finance";
import type { UndervaluedTheme } from "@/types/undervalued";
import type {
  AnalysisSignal,
  DisclosureNote,
  FinancialHighlight,
} from "@/types/undervalued-analysis";

const THEME_PRIORITY_METRICS: Record<UndervaluedTheme, string[]> = {
  semiconductor: [
    "매출액",
    "영업이익",
    "영업이익률",
    "ROE",
    "EPS",
    "부채비율",
  ],
  bio: ["매출액", "영업이익", "순이익률", "부채비율", "ROE", "EPS"],
  battery: ["매출액", "영업이익", "영업이익률", "부채비율", "ROE", "EPS"],
  auto: ["매출액", "영업이익", "영업이익률", "ROE", "EPS", "PBR"],
  finance: ["ROE", "부채비율", "당좌비율", "EPS", "PER", "PBR"],
  platform: ["매출액", "영업이익", "영업이익률", "ROE", "EPS", "순이익률"],
};

const DISCLOSURE_RULES: Array<{
  pattern: RegExp;
  category: string;
  impactHint: string;
  weight: number;
}> = [
  {
    pattern: /실적|영업\(잠정\)|매출액|손실|흑자|적자/,
    category: "earnings",
    impactHint: "실적·가이던스 변화",
    weight: 4,
  },
  {
    pattern: /분기보고서|반기보고서|사업보고서/,
    category: "filing",
    impactHint: "정기 재무공시",
    weight: 3,
  },
  {
    pattern: /배당/,
    category: "dividend",
    impactHint: "주주환원",
    weight: 3,
  },
  {
    pattern: /자기주식|소각|취득/,
    category: "buyback",
    impactHint: "자사주·소각",
    weight: 3,
  },
  {
    pattern: /유상증자|전환사채|신주인수권|감자/,
    category: "dilution",
    impactHint: "지분·재무구조 변화",
    weight: 4,
  },
  {
    pattern: /합병|분할|인수|M&A/,
    category: "mna",
    impactHint: "구조조정·M&A",
    weight: 4,
  },
  {
    pattern: /IR|기업설명회/,
    category: "ir",
    impactHint: "IR·가이던스",
    weight: 2,
  },
  {
    pattern: /소송|횡령|제재|감사의견|의견거절/,
    category: "risk",
    impactHint: "리스크 이벤트",
    weight: 4,
  },
];

const DISCLOSURE_NOISE = [/가격제한폭/, /의결권/, /신탁업자/, /공매도/];

export interface UndervaluedAnalysisInput {
  ticker: string;
  name: string;
  theme: UndervaluedTheme;
  themeLabel: string;
  per: number;
  sectorAvgPer: number;
  pbr: number;
  roe: number;
  discountPercent: number;
}

export interface UndervaluedFinanceContext {
  input: UndervaluedAnalysisInput;
  financialHighlights: FinancialHighlight[];
  disclosureNotes: DisclosureNote[];
  compressedFinance: string;
  compressedDisclosures: string;
  negativeSignals: number;
  positiveSignals: number;
}

function parseMetricNumber(value: string | undefined): number | null {
  if (!value || value === "-" || value === "N/A") return null;
  const normalized = value.replace(/,/g, "").replace(/[^\d.-]/g, "").trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function actualPeriods(periods: NaverFinancePeriod[]): NaverFinancePeriod[] {
  return periods.filter((period) => !period.isConsensus);
}

function getMetricSeries(
  sheet: NaverKrFinanceSheet,
  metricTitle: string,
  maxPeriods = 4,
): Array<{ label: string; value: number | null }> {
  const row = sheet.rows.find((item) => item.title === metricTitle);
  if (!row) return [];

  const periods = actualPeriods(sheet.periods).slice(-maxPeriods);
  return periods.map((period) => ({
    label: period.label,
    value: parseMetricNumber(row.values[period.key]),
  }));
}

function trendSignal(
  series: Array<{ value: number | null }>,
  higherIsBetter = true,
): AnalysisSignal {
  const values = series.map((item) => item.value).filter((v): v is number => v !== null);
  if (values.length < 2) return "neutral";

  const first = values[0];
  const last = values[values.length - 1];
  if (first === 0) return "neutral";

  const changePct = ((last - first) / Math.abs(first)) * 100;
  if (Math.abs(changePct) < 3) return "neutral";

  const improving = changePct > 0;
  if (higherIsBetter) return improving ? "positive" : "negative";
  return improving ? "negative" : "positive";
}

function formatSeriesDetail(
  series: Array<{ label: string; value: number | null }>,
): string {
  const parts = series
    .filter((item) => item.value !== null)
    .map((item) => `${item.label} ${item.value!.toLocaleString("ko-KR")}`);
  return parts.join(" → ");
}

function lowerIsBetterMetric(title: string): boolean {
  return title === "부채비율" || title === "PER" || title === "PBR";
}

function buildMetricHighlight(
  sheet: NaverKrFinanceSheet,
  metricTitle: string,
): FinancialHighlight | null {
  const series = getMetricSeries(sheet, metricTitle, 4);
  if (series.every((item) => item.value === null)) return null;

  const signal = trendSignal(series, !lowerIsBetterMetric(metricTitle));
  const detail = formatSeriesDetail(series);
  if (!detail) return null;

  return { label: metricTitle, detail, signal };
}

function buildFinancialHighlights(
  quarter: NaverKrFinanceSheet | null,
  annual: NaverKrFinanceSheet | null,
  theme: UndervaluedTheme,
): FinancialHighlight[] {
  const sheet = quarter ?? annual;
  if (!sheet) return [];

  const highlights: FinancialHighlight[] = [];
  const metrics = THEME_PRIORITY_METRICS[theme];

  for (const metric of metrics) {
    const highlight = buildMetricHighlight(sheet, metric);
    if (highlight) highlights.push(highlight);
    if (highlights.length >= 5) break;
  }

  if (highlights.length === 0 && sheet.rows.length > 0) {
    for (const row of sheet.rows.slice(0, 4)) {
      const highlight = buildMetricHighlight(sheet, row.title);
      if (highlight) highlights.push(highlight);
    }
  }

  return highlights;
}

function classifyDisclosure(
  disclosure: NaverKrDisclosure,
): { category: string; impactHint: string; weight: number } | null {
  if (DISCLOSURE_NOISE.some((pattern) => pattern.test(disclosure.title))) {
    return null;
  }

  let best: { category: string; impactHint: string; weight: number } | null =
    null;

  for (const rule of DISCLOSURE_RULES) {
    if (!rule.pattern.test(disclosure.title)) continue;
    if (!best || rule.weight > best.weight) {
      best = {
        category: rule.category,
        impactHint: rule.impactHint,
        weight: rule.weight,
      };
    }
  }

  return best;
}

function formatDisclosureDate(datetime: string): string {
  const date = new Date(datetime);
  if (Number.isNaN(date.getTime())) return datetime.slice(0, 10);
  return date.toLocaleDateString("ko-KR");
}

function buildDisclosureNotes(
  disclosures: NaverKrDisclosure[],
): DisclosureNote[] {
  const scored = disclosures
    .map((disclosure) => {
      const match = classifyDisclosure(disclosure);
      if (!match) return null;
      return {
        disclosure,
        ...match,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .sort((a, b) => b.weight - a.weight);

  const seen = new Set<string>();
  const notes: DisclosureNote[] = [];

  for (const item of scored) {
    const key = `${item.category}:${item.disclosure.title}`;
    if (seen.has(key)) continue;
    seen.add(key);

    notes.push({
      date: formatDisclosureDate(item.disclosure.datetime),
      title: item.disclosure.title,
      impact: item.impactHint,
      category: item.category,
    });

    if (notes.length >= 5) break;
  }

  return notes;
}

function compressFinanceSheet(sheet: NaverKrFinanceSheet | null): string {
  if (!sheet) return "FIN none";

  const periods = actualPeriods(sheet.periods)
    .slice(-4)
    .map((period) => period.key)
    .join(",");

  const lines = sheet.rows
    .filter((row) =>
      [
        "매출액",
        "영업이익",
        "당기순이익",
        "영업이익률",
        "ROE",
        "부채비율",
        "EPS",
      ].includes(row.title),
    )
    .map((row) => {
      const values = actualPeriods(sheet.periods)
        .slice(-4)
        .map((period) => row.values[period.key] ?? "-")
        .join("|");
      return `${row.title}:${values}`;
    });

  return `FIN ${sheet.periodType} periods=${periods}\n${lines.join("\n")}`;
}

function compressDisclosures(notes: DisclosureNote[]): string {
  if (notes.length === 0) return "DISC none";
  return notes
    .map((note) => `${note.date}|${note.category}|${note.title}`)
    .join("\n");
}

export function buildUndervaluedFinanceContext(
  input: UndervaluedAnalysisInput,
  quarter: NaverKrFinanceSheet | null,
  annual: NaverKrFinanceSheet | null,
  disclosures: NaverKrDisclosure[],
): UndervaluedFinanceContext {
  const financialHighlights = buildFinancialHighlights(quarter, annual, input.theme);
  const disclosureNotes = buildDisclosureNotes(disclosures);

  const negativeSignals = financialHighlights.filter(
    (item) => item.signal === "negative",
  ).length;
  const positiveSignals = financialHighlights.filter(
    (item) => item.signal === "positive",
  ).length;

  return {
    input,
    financialHighlights,
    disclosureNotes,
    compressedFinance: [compressFinanceSheet(quarter), compressFinanceSheet(annual)]
      .filter((line) => line !== "FIN none")
      .join("\n"),
    compressedDisclosures: compressDisclosures(disclosureNotes),
    negativeSignals,
    positiveSignals,
  };
}
