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
} from "@/lib/undervalued-scoring";
import type { UndervaluedPick } from "@/types/undervalued";

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

export async function fetchLiveUndervaluedPicks(): Promise<{
  picks: UndervaluedPick[];
  fetchedAt: string;
  source: "naver";
}> {
  const fetchedAt = new Date().toISOString();

  const entries = UNDERVALUED_UNIVERSE_TICKERS.map(
    (ticker) => UNDERVALUED_UNIVERSE.get(ticker)!,
  );

  const candidates = await mapInBatches(
    entries,
    NAVER_BATCH_SIZE,
    (entry) => buildPickForTicker(entry, fetchedAt),
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
