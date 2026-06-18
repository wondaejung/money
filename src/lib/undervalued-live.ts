import {
  UNDERVALUED_UNIVERSE,
  UNDERVALUED_UNIVERSE_TICKERS,
  type UndervaluedUniverseEntry,
} from "@/data/undervalued-universe";
import { mapInBatches } from "@/lib/fetch-batched";
import {
  fetchNaverKrFundamentals,
  fetchNaverKrQuote,
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

export type UndervaluedLiveData = {
  picks: UndervaluedPick[];
  picksByTheme: Record<UndervaluedTheme, UndervaluedPick[]>;
  fetchedAt: string;
  source: "naver";
};

const NAVER_BATCH_SIZE = 6;

async function buildPickForTicker(
  entry: UndervaluedUniverseEntry,
  fetchedAt: string,
): Promise<UndervaluedPick | null> {
  const quote = await fetchNaverKrQuote(entry.ticker);
  if (!quote) return null;

  const fundamentals = await fetchNaverKrFundamentals(entry.ticker);
  const per = fundamentals?.per;
  const pbr = fundamentals?.pbr;
  const roe = fundamentals?.roe;
  const sectorAvgPer = fundamentals?.sectorAvgPer ?? entry.sectorAvgPer;

  if (per == null || pbr == null || roe == null || sectorAvgPer <= 0) {
    return null;
  }

  const discountPercent = recalculateDiscount(per, sectorAvgPer);
  const undervaluedScore = computeUndervaluedScore(discountPercent, roe, pbr);

  return {
    id: entry.seedId ?? `uv-live-${entry.ticker}`,
    name: fundamentals?.name ?? quote.name ?? entry.name,
    ticker: entry.ticker,
    market: "KR",
    theme: entry.theme,
    themeLabel: entry.themeLabel,
    currentPrice: quote.price,
    currency: "KRW",
    per,
    sectorAvgPer,
    pbr,
    roe,
    discountPercent,
    undervaluedScore,
    reason: entry.reason,
    catalyst: entry.catalyst,
    expectedTimeline: entry.expectedTimeline,
    changePercent: quote.changePercent,
    fetchedAt,
    priceSource: "naver",
  };
}

export async function fetchLiveUndervaluedPicks(): Promise<UndervaluedLiveData> {
  const fetchedAt = new Date().toISOString();

  const entries = UNDERVALUED_UNIVERSE_TICKERS.map(
    (ticker) => UNDERVALUED_UNIVERSE.get(ticker)!,
  );

  const candidates = await mapInBatches(
    entries,
    NAVER_BATCH_SIZE,
    (entry) => buildPickForTicker(entry, fetchedAt),
  );

  const validCandidates = candidates.filter(
    (pick): pick is UndervaluedPick => pick !== null,
  );

  const picksByTheme = Object.fromEntries(
    UNDERVALUED_THEMES.map((theme) => [
      theme,
      topUndervaluedPicks(
        validCandidates.filter((pick) => pick.theme === theme),
        10,
      ),
    ]),
  ) as Record<UndervaluedTheme, UndervaluedPick[]>;

  const picks = topUndervaluedPicks(
    UNDERVALUED_THEMES.flatMap((theme) => picksByTheme[theme]),
    10,
  );

  return { picks, picksByTheme, fetchedAt, source: "naver" };
}
