import type { MarketFilter } from "@/types/market";
import type { LiveHolding } from "@/types/portfolio";
import type { TreemapNode } from "@/types/stock";

export function filterHoldings<T extends { market: LiveHolding["market"] }>(
  holdings: T[],
  filter: MarketFilter,
): T[] {
  if (filter === "ALL") return holdings;
  return holdings.filter((holding) => holding.market === filter);
}

export function buildTreemapData(
  holdings: LiveHolding[],
  filter: MarketFilter,
): TreemapNode[] {
  return filterHoldings(holdings, filter).map((holding) => ({
    name: holding.name,
    symbol: holding.symbol,
    market: holding.market,
    size: holding.valueKrw,
    changePercent: holding.gainPercentAfterTax,
    valueKrw: holding.valueKrw,
  }));
}

export function getPortfolioTaxSummary(
  holdings: LiveHolding[],
  filter: MarketFilter,
) {
  const filtered = filterHoldings(holdings, filter);

  const totalValueKrw = filtered.reduce((sum, h) => sum + h.valueKrw, 0);
  const totalGainPreTaxKrw = filtered.reduce(
    (sum, h) => sum + h.gainAmountKrw,
    0,
  );
  const totalTaxKrw = filtered.reduce((sum, h) => sum + h.estimatedTaxKrw, 0);
  const totalCommissionKrw = filtered.reduce(
    (sum, h) => sum + h.totalCommissionKrw,
    0,
  );
  const totalGainAfterTaxKrw = filtered.reduce(
    (sum, h) => sum + h.gainAfterTaxKrw,
    0,
  );

  const totalCostKrw = filtered.reduce(
    (sum, h) => sum + h.valueKrw - h.gainAmountKrw,
    0,
  );

  const weightedGainPercent =
    totalCostKrw === 0
      ? 0
      : filtered.reduce((sum, holding) => {
          const weight = (holding.valueKrw - holding.gainAmountKrw) / totalCostKrw;
          return sum + holding.gainPercentAfterTax * weight;
        }, 0);

  return {
    totalValueKrw,
    totalGainPreTaxKrw,
    totalTaxKrw,
    totalCommissionKrw,
    totalGainAfterTaxKrw,
    weightedGainPercent,
    count: filtered.length,
  };
}
