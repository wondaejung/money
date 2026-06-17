export type PredictionOutcome = "pending" | "success" | "failure";

/** 시간외 단일가 마감 기준 추천 종목 (다음 거래일 TOP 3) */
export interface AfterHoursPick {
  symbol: string;
  name: string;
  sector: string;
  regularClosePrice: number;
  afterHoursClosePrice: number;
  /** 정규장 종가 대비 시간외 등락률(%) */
  afterHoursChangePercent: number;
  /** AI 예측 — 다음 거래일 상승 확률(%) */
  riseProbability: number;
  reason: string;
}

/** 개별 종목 검증 결과 */
export interface PredictionVerification {
  symbol: string;
  name: string;
  /** 기준가 — 전일 정규장 종가 또는 시간외 최종가 */
  baselinePrice: number;
  baselineType: "regular_close" | "after_hours_close";
  nextDayOpen: number | null;
  nextDayHigh: number | null;
  nextDayClose: number | null;
  /** 당일 최대 수익률(%) — baseline 대비 고가 기준 */
  maxGainPercent: number | null;
  outcome: PredictionOutcome;
  verifiedAt: string | null;
}

/** 한국 시간외 마감(18:00) 기준 종가 베팅 예측 세트 */
export interface ClosingBellPrediction {
  id: string;
  /** 예측 시점 — 한국 시간외 단일가 마감 직후 (18:00 KST) */
  krAfterHoursClosedAt: string;
  /** 검증 대상 거래일 (다음 거래일, YYYY-MM-DD) */
  targetTradingDate: string;
  /** 다음 날 정규장 마감(15:30 KST) 후 검증 완료 시각 */
  nextDayMarketClosedAt: string | null;
  marketSummary: string;
  picks: AfterHoursPick[];
  verifications: PredictionVerification[];
  isArchived: boolean;
  archivedAt: string | null;
  createdAt: string;
}

export interface TodayAfterHoursSnapshot {
  krAfterHoursClosedAt: string;
  targetTradingDate: string;
  marketSummary: string;
  picks: AfterHoursPick[];
}

export interface PredictionsApiResponse {
  snapshot: TodayAfterHoursSnapshot;
  predictionSource: "llm" | "rule";
  llmProvider?: string | null;
  llmError?: string;
  fetchedAt: string;
}

export interface VerifyPredictionsApiResponse {
  targetTradingDate: string;
  verifications: PredictionVerification[];
  nextDayMarketClosedAt: string;
  fetchedAt: string;
}
