export interface UsIndex {
  name: string;
  value: number;
  changePercent: number;
}

export interface OvernightIssue {
  id: string;
  title: string;
  summary: string;
}

export type ThemeImpact = "positive" | "negative" | "neutral";

export interface ThemeForecast {
  id: string;
  usTrigger: string;
  krTheme: string;
  impact: ThemeImpact;
  relatedStocks: string[];
}

export interface MorningBriefingData {
  updatedAt: string;
  usIndices: UsIndex[];
  overnightIssues: OvernightIssue[];
  themeForecasts: ThemeForecast[];
}
