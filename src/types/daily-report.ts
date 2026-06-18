export interface DailyMarketReport {
  targetDate: string;
  headline: string;
  facts: [string, string, string];
  portfolioImpact: string;
  reportSource: "llm" | "rule";
  llmProvider: string | null;
  llmError?: string;
  publishedAt: string;
  closedAtLabel: string;
}

export interface DailyReportApiResponse {
  report: DailyMarketReport;
  pending: boolean;
  pendingMessage?: string;
  fetchedAt: string;
}
