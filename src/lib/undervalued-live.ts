import {
  UNDERVALUED_UNIVERSE,
  UNDERVALUED_UNIVERSE_TICKERS,
  type UndervaluedUniverseEntry,
} from "@/data/undervalued-universe";
import { fetchNaverKrIntegrationMetrics } from "@/lib/naver-finance";
import {
  computeUndervaluedScore,
  recalculateDiscount,
} from "@/lib/undervalued-scoring";
import type { UndervaluedPick } from "@/types/undervalued";

function buildPickFromLive(
  entry: UndervaluedUniverseEntry,
  live: NonNullable<Awaited<ReturnType<typeof fetchNaverKrIntegrationMetrics>>>,
  fetchedAt: string,
): UndervaluedPick | null {
  const per = live.per;
  const pbr = live.pbr;
  const roe = live.roe;
  const sectorAvgPer = live.sectorAvgPer ?? entry.sectorAvgPer;

  if (per == null || pbr == null || roe == null || sectorAvgPer <= 0) {
    return null;
  }

  const discountPercent = recalculateDiscount(per, sectorAvgPer);
  const undervaluedScore = computeUndervaluedScore(discountPercent, roe, pbr);

  return {
    id: entry.seedId ?? `uv-live-${entry.ticker}`,
    name: live.name || entry.name,
    ticker: entry.ticker,
    market: "KR",
    theme: entry.theme,
    themeLabel: entry.themeLabel,
    currentPrice: live.currentPrice,
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
    changePercent: live.changePercent,
    fetchedAt,
    priceSource: "naver",
  };
}

export async function fetchLiveUndervaluedPicks(): Promise<{
  picks: UndervaluedPick[];
  fetchedAt: string;
  source: "naver";
}> {
  const fetchedAt = new Date().toISOString();

  const candidates = await Promise.all(
    UNDERVALUED_UNIVERSE_TICKERS.map(async (ticker) => {
      const entry = UNDERVALUED_UNIVERSE.get(ticker);
      if (!entry) return null;

      const live = await fetchNaverKrIntegrationMetrics(ticker);
      if (!live) return null;

      return buildPickFromLive(entry, live, fetchedAt);
    }),
  );

  const ranked = candidates
    .filter((pick): pick is UndervaluedPick => pick !== null)
    .sort((a, b) => {
      const aUndervalued = a.discountPercent > 0 ? 1 : 0;
      const bUndervalued = b.discountPercent > 0 ? 1 : 0;
      if (bUndervalued !== aUndervalued) return bUndervalued - aUndervalued;
      if (b.undervaluedScore !== a.undervaluedScore) {
        return b.undervaluedScore - a.undervaluedScore;
      }
      return b.discountPercent - a.discountPercent;
    })
    .slice(0, 10);

  return { picks: ranked, fetchedAt, source: "naver" };
}
