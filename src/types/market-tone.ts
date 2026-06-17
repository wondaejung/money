export type MarketSentimentLevel = "greed" | "neutral" | "fear";

export type AfterHoursFeatureBadge =
  | "change_leader"
  | "volume_leader"
  | "momentum";

export interface AfterHoursFeaturedStock {
  symbol: string;
  name: string;
  afterHoursClosePrice: number;
  afterHoursChangePercent: number;
  tradingValueKrw: number;
  tradingValueLabel: string;
  badges: AfterHoursFeatureBadge[];
  rank: number;
}

export interface MarketSentiment {
  level: MarketSentimentLevel;
  score: number;
  label: string;
  summary: string;
  kospiChangePercent: number;
  kosdaqChangePercent: number;
  advancingRatio: number;
}

export interface MarketToneApiResponse {
  sessionDate: string;
  closedAtLabel: string;
  featuredStocks: AfterHoursFeaturedStock[];
  sentiment: MarketSentiment;
  fetchedAt: string;
}
