import {
  UNDERVALUED_THEME_SCREENS,
  type UndervaluedThemeScreenConfig,
} from "@/data/undervalued-theme-industries";
import { UNDERVALUED_UNIVERSE } from "@/data/undervalued-universe";
import { mapInBatches } from "@/lib/fetch-batched";
import {
  fetchNaverKrFundamentals,
  fetchNaverKrQuote,
  fetchNaverThemeStockCandidates,
  type NaverIndustryStockCandidate,
} from "@/lib/naver-finance";
import {
  computeUndervaluedScore,
  recalculateDiscount,
  topUndervaluedPicks,
} from "@/lib/undervalued-scoring";
import type { UndervaluedPick, UndervaluedTheme } from "@/types/undervalued";

const UNDERVALUED_THEMES: UndervaluedTheme[] = [
  "semiconductor",
  "bio",
  "battery",
  "auto",
  "finance",
  "platform",
];

const NAVER_BATCH_SIZE = 10;
const SCREEN_CANDIDATES_PER_THEME = 50;
const TOP_PER_THEME = 10;

export type UndervaluedLiveData = {
  picks: UndervaluedPick[];
  picksByTheme: Record<UndervaluedTheme, UndervaluedPick[]>;
  fetchedAt: string;
  source: "naver";
};

interface ThemeScreenCandidate extends NaverIndustryStockCandidate {
  theme: UndervaluedTheme;
  themeLabel: string;
  defaultSectorAvgPer: number;
}

interface RawThemePick {
  candidate: ThemeScreenCandidate;
  quote: NonNullable<Awaited<ReturnType<typeof fetchNaverKrQuote>>>;
  per: number;
  pbr: number;
  roe: number;
  marketCapKrw: number;
}

function computeSectorAvgPer(
  rows: Array<{ per: number; marketCapKrw: number }>,
  fallback: number,
): number {
  const valid = rows.filter((row) => row.per > 0);
  if (valid.length === 0) return fallback;

  const withCap = valid.filter((row) => row.marketCapKrw > 0);
  if (withCap.length > 0) {
    const totalCap = withCap.reduce((sum, row) => sum + row.marketCapKrw, 0);
    if (totalCap > 0) {
      return (
        withCap.reduce((sum, row) => sum + row.per * row.marketCapKrw, 0) /
        totalCap
      );
    }
  }

  return valid.reduce((sum, row) => sum + row.per, 0) / valid.length;
}

function finalizePick(
  raw: RawThemePick,
  fetchedAt: string,
  sectorAvgPer: number,
): UndervaluedPick {
  const { candidate, quote, per, pbr, roe } = raw;
  const discountPercent = recalculateDiscount(per, sectorAvgPer);
  const undervaluedScore = computeUndervaluedScore(discountPercent, roe, pbr);
  const seed = UNDERVALUED_UNIVERSE.get(candidate.ticker);

  return {
    id: seed?.seedId ?? `uv-live-${candidate.ticker}`,
    name: quote.name ?? candidate.name,
    ticker: candidate.ticker,
    market: "KR",
    theme: candidate.theme,
    themeLabel: candidate.themeLabel,
    currentPrice: quote.price,
    currency: "KRW",
    per,
    sectorAvgPer,
    pbr,
    roe,
    discountPercent,
    undervaluedScore,
    reason:
      seed?.reason ??
      `${candidate.name} — 네이버 ${candidate.themeLabel} 업종 PER·PBR·ROE 실시간 스크리닝.`,
    catalyst:
      seed?.catalyst ??
      "업종 평균 대비 밸류에이션 개선 또는 실적 서프라이즈 시 재평가 가능.",
    expectedTimeline: seed?.expectedTimeline ?? "다음 분기 실적 시즌",
    changePercent: quote.changePercent,
    fetchedAt,
    priceSource: "naver",
  };
}

async function fetchRawThemePick(
  candidate: ThemeScreenCandidate,
): Promise<RawThemePick | null> {
  const [quote, fundamentals] = await Promise.all([
    fetchNaverKrQuote(candidate.ticker),
    fetchNaverKrFundamentals(candidate.ticker),
  ]);

  if (!quote) return null;

  const per = fundamentals?.per;
  const pbr = fundamentals?.pbr;
  const roe = fundamentals?.roe;

  if (per == null || pbr == null || roe == null) return null;

  return {
    candidate,
    quote,
    per,
    pbr,
    roe,
    marketCapKrw: fundamentals?.marketCapKrw ?? candidate.marketCapKrw,
  };
}

async function screenThemePicks(
  config: UndervaluedThemeScreenConfig,
  fetchedAt: string,
): Promise<UndervaluedPick[]> {
  const candidates = await fetchNaverThemeStockCandidates(
    config.industryCodes,
    SCREEN_CANDIDATES_PER_THEME,
  );

  if (candidates.length === 0) return [];

  const themeCandidates: ThemeScreenCandidate[] = candidates.map((candidate) => ({
    ...candidate,
    theme: config.theme,
    themeLabel: config.themeLabel,
    defaultSectorAvgPer: config.defaultSectorAvgPer,
  }));

  const rawPicks = await mapInBatches(
    themeCandidates,
    NAVER_BATCH_SIZE,
    (candidate) => fetchRawThemePick(candidate),
  );

  const validRaw = rawPicks.filter(
    (pick): pick is RawThemePick => pick !== null,
  );

  if (validRaw.length === 0) return [];

  const sectorAvgPer = computeSectorAvgPer(
    validRaw.map((row) => ({ per: row.per, marketCapKrw: row.marketCapKrw })),
    config.defaultSectorAvgPer,
  );

  return topUndervaluedPicks(
    validRaw.map((raw) => finalizePick(raw, fetchedAt, sectorAvgPer)),
    TOP_PER_THEME,
  );
}

export async function fetchLiveUndervaluedPicks(): Promise<UndervaluedLiveData> {
  const fetchedAt = new Date().toISOString();

  const themeResults = await Promise.all(
    UNDERVALUED_THEME_SCREENS.map((config) =>
      screenThemePicks(config, fetchedAt),
    ),
  );

  const picksByTheme = Object.fromEntries(
    UNDERVALUED_THEMES.map((theme, index) => [
      theme,
      themeResults[index] ?? [],
    ]),
  ) as Record<UndervaluedTheme, UndervaluedPick[]>;

  const picks = topUndervaluedPicks(
    UNDERVALUED_THEMES.flatMap((theme) => picksByTheme[theme]),
    TOP_PER_THEME,
  );

  return { picks, picksByTheme, fetchedAt, source: "naver" };
}
