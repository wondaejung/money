export type ExpertStance = "bullish" | "bearish" | "neutral";

export interface ExpertVideoSummary {
  videoId: string;
  title: string;
  url: string;
  publishedText: string;
  hasTranscript: boolean;
  headline: string;
  keyPoints: string[];
  stance: ExpertStance;
  topics: string[];
}

export interface ExpertOpinionReport {
  expertName: string;
  channelName: string;
  generatedAt: string;
  videos: ExpertVideoSummary[];
  dailyTakeaway: string;
  summarySource: "llm" | "rule";
  llmError?: string;
}

export interface ExpertOpinionApiResponse {
  report: ExpertOpinionReport | null;
  error?: string;
}
