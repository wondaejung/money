export type AnalysisSignal = "positive" | "negative" | "neutral";

export type ValueTrapRisk = "low" | "medium" | "high";

export interface FinancialHighlight {
  label: string;
  detail: string;
  signal: AnalysisSignal;
}

export interface DisclosureNote {
  date: string;
  title: string;
  impact: string;
  category: string;
}

export interface UndervaluedDeepAnalysis {
  ticker: string;
  name: string;
  source: "llm" | "rule";
  provider?: string | null;
  valueTrapRisk: ValueTrapRisk;
  reason: string;
  catalyst: string;
  expectedTimeline: string;
  financialHighlights: FinancialHighlight[];
  disclosureNotes: DisclosureNote[];
  keyWatchpoints: string[];
  generatedAt: string;
  cached?: boolean;
  error?: string;
}

export interface UndervaluedAnalysisApiResponse {
  analysis: UndervaluedDeepAnalysis;
  cached: boolean;
  llmAvailable: boolean;
  fetchedAt: string;
}
