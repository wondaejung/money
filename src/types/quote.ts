import type { LiveHolding, SellRecommendation } from "@/types/portfolio";
import type { StockHolding } from "@/types/stock";

export interface YahooQuote {
  symbol: string;
  price: number;
  previousClose: number;
  changePercent: number;
  currency: string;
  name: string;
}

export interface PortfolioApiResponse {
  holdings: StockHolding[];
  usdToKrw: number;
  fetchedAt: string;
  source: "yahoo";
}

export interface LivePortfolioApiResponse {
  holdings: LiveHolding[];
  sellRecommendations: SellRecommendation[];
  sellAdviceSource?: "llm" | "rule";
  sellAdviceLlmProvider?: import("@/lib/llm-briefing").LlmProvider | null;
  sellAdviceLlmError?: string;
  usdToKrw: number;
  fxSource?: "naver" | "yahoo" | "fallback";
  fxValid?: boolean;
  fetchedAt: string;
  source: "yahoo";
}

export interface BriefingApiResponse {
  usIndices: import("@/types/briefing").UsIndex[];
  overnightIssues: import("@/types/briefing").OvernightIssue[];
  themeForecasts: import("@/types/briefing").ThemeForecast[];
  fetchedAt: string;
  briefingSource: "llm" | "mock";
  llmProvider?: import("@/lib/llm-briefing").LlmProvider | null;
  llmError?: string;
}
