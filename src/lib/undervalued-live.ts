import { mockUndervaluedPicks } from "@/data/mock-undervalued";
import { fetchNaverKrIntegrationMetrics } from "@/lib/naver-finance";
import type { UndervaluedPick } from "@/types/undervalued";

const KR_SEED_PICKS = mockUndervaluedPicks.filter((pick) => pick.market === "KR");

function recalculateDiscount(per: number, sectorAvgPer: number): number {
  if (sectorAvgPer <= 0) return 0;
  return Math.max(0, Math.round((1 - per / sectorAvgPer) * 100));
}

export async function fetchLiveUndervaluedPicks(): Promise<{
  picks: UndervaluedPick[];
  fetchedAt: string;
  source: "naver";
}> {
  const fetchedAt = new Date().toISOString();

  const picks = await Promise.all(
    KR_SEED_PICKS.map(async (seed) => {
      const live = await fetchNaverKrIntegrationMetrics(seed.ticker);

      if (!live) {
        return {
          ...seed,
          fetchedAt,
          priceSource: "naver" as const,
        };
      }

      const per = live.per ?? seed.per;
      const sectorAvgPer = live.sectorAvgPer ?? seed.sectorAvgPer;
      const discountPercent = recalculateDiscount(per, sectorAvgPer);

      return {
        ...seed,
        name: live.name || seed.name,
        currentPrice: live.currentPrice,
        changePercent: live.changePercent,
        per,
        sectorAvgPer,
        pbr: live.pbr ?? seed.pbr,
        roe: live.roe ?? seed.roe,
        discountPercent,
        fetchedAt,
        priceSource: "naver" as const,
      };
    }),
  );

  return { picks, fetchedAt, source: "naver" };
}
