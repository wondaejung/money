import type { Market } from "@/types/market";

export function getChangeTextClass(market: Market, changePercent: number): string {
  const isUp = changePercent >= 0;

  if (market === "KR") {
    return isUp ? "text-red-500" : "text-blue-500";
  }

  return isUp ? "text-emerald-500" : "text-rose-500";
}

export function getTreemapFillColor(market: Market, gainPercent: number): string {
  const magnitude = Math.min(Math.abs(gainPercent) / 20, 1);
  const intensity = 0.35 + magnitude * 0.45;

  if (market === "KR") {
    return gainPercent >= 0
      ? `rgba(239, 68, 68, ${intensity})`
      : `rgba(59, 130, 246, ${intensity})`;
  }

  return gainPercent >= 0
    ? `rgba(16, 185, 129, ${intensity})`
    : `rgba(244, 63, 94, ${intensity})`;
}

export function formatChangePercent(changePercent: number): string {
  const sign = changePercent >= 0 ? "+" : "";
  return `${sign}${changePercent.toFixed(2)}%`;
}
