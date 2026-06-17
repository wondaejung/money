import type { LiveHolding, UserPosition } from "@/types/portfolio";

export type PortfolioDisplayRow =
  | { kind: "live"; holding: LiveHolding }
  | { kind: "pending"; position: UserPosition };

export function mergePortfolioDisplayRows(
  positions: UserPosition[],
  holdings: LiveHolding[],
): PortfolioDisplayRow[] {
  const holdingMap = new Map(holdings.map((holding) => [holding.id, holding]));

  return positions.map((position) => {
    const holding = holdingMap.get(position.id);
    if (holding) {
      return { kind: "live", holding };
    }
    return { kind: "pending", position };
  });
}

export function getLiveHoldingsFromRows(
  rows: PortfolioDisplayRow[],
): LiveHolding[] {
  return rows
    .filter((row): row is { kind: "live"; holding: LiveHolding } => row.kind === "live")
    .map((row) => row.holding);
}
