import type { Market } from "@/types/market";

export type MacroSensitivity = "high" | "medium" | "low";
export type WeekTrend = "up" | "side" | "down";

export interface MacroImpactHolding {
  id: string;
  symbol: string;
  name: string;
  market: Market;
  macroSensitivity: MacroSensitivity;
  /** 0–100, 높을수록 글로벌 매크로에 민감 */
  sensitivityScore: number;
  connectedIssues: string[];
  trend: WeekTrend;
  aiComment: string;
  strategyHint: string;
}

export interface UndervaluedStock {
  symbol: string;
  name: string;
  market: Market;
  sector: string;
  per: number | null;
  pbr: number | null;
  /** 시장·섹터 대비 할인율(%) — null이면 미제공 */
  discountPercent: number | null;
  isOwned: boolean;
  reason: string;
}

export interface BlindSpotSector {
  id: string;
  sector: string;
  market: Market;
  isOwned: boolean;
  portfolioWeightPercent: number;
  insight: string;
  recommendations: UndervaluedStock[];
}

export interface InsightsMockData {
  blindSpotSectors: BlindSpotSector[];
}
