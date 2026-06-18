export type MarketRegion = "KR" | "US";

export type UndervaluedTheme =
  | "semiconductor"
  | "bio"
  | "battery"
  | "auto"
  | "finance"
  | "platform";

export type UndervaluedThemeFilter = "all" | UndervaluedTheme;

export interface UndervaluedPick {
  id: string;
  name: string;
  ticker: string;
  market: MarketRegion;
  theme: UndervaluedTheme;
  themeLabel: string;
  currentPrice: number;
  currency: "KRW" | "USD";
  per: number;
  sectorAvgPer: number;
  pbr: number;
  roe: number;
  discountPercent: number;
  undervaluedScore: number;
  reason: string;
  catalyst: string;
  expectedTimeline: string;
  changePercent?: number;
  fetchedAt?: string;
  priceSource?: "naver";
}

export const UNDERVALUED_THEME_LABELS: Record<UndervaluedTheme, string> = {
  semiconductor: "반도체",
  bio: "바이오",
  battery: "2차전지",
  auto: "자동차",
  finance: "금융",
  platform: "플랫폼",
};

export const UNDERVALUED_THEME_FILTERS: Array<{
  value: UndervaluedThemeFilter;
  label: string;
}> = [
  { value: "all", label: "전체" },
  { value: "semiconductor", label: "반도체" },
  { value: "bio", label: "바이오" },
  { value: "battery", label: "2차전지" },
  { value: "auto", label: "자동차" },
  { value: "finance", label: "금융" },
  { value: "platform", label: "플랫폼" },
];
