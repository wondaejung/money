import {
  formatKstDate,
  getAfterHoursCloseIso,
  getNextTradingDate,
  getPredictionSessionDate,
  getPreviousTradingDate,
  getRegularMarketCloseIso,
} from "@/lib/kr-market-time";
import type {
  ClosingBellPrediction,
  TodayAfterHoursSnapshot,
} from "@/types/prediction";

export function getTodayAfterHoursSnapshot(): TodayAfterHoursSnapshot {
  const sessionDate = getPredictionSessionDate();
  const targetTradingDate = getNextTradingDate(
    new Date(getAfterHoursCloseIso(sessionDate)),
  );

  return {
    krAfterHoursClosedAt: getAfterHoursCloseIso(sessionDate),
    targetTradingDate,
    marketSummary:
      "오후 6시 단일가 거래에서 반도체·조선 섹터 거래량 급증 마감 → 내일 아침 9시 강세 기대",
    picks: [
      {
        symbol: "082740",
        name: "한화엔진",
        sector: "조선/방산",
        regularClosePrice: 65500,
        afterHoursClosePrice: 67700,
        afterHoursChangePercent: 3.36,
        riseProbability: 78,
        reason:
          "시간외 단일가 +3.4% 마감·외국인 순매수 유입 — 다음 거래일 시가 갭상승 가능성",
      },
      {
        symbol: "000660",
        name: "SK하이닉스",
        sector: "반도체",
        regularClosePrice: 198500,
        afterHoursClosePrice: 201000,
        afterHoursChangePercent: 1.26,
        riseProbability: 71,
        reason:
          "밤사이 SOX 상승 연동·시간외 매수 잔량 증가 — 개장 초반 반도체 동반 강세",
      },
      {
        symbol: "458870",
        name: "씨어스",
        sector: "헬스케어",
        regularClosePrice: 34900,
        afterHoursClosePrice: 36200,
        afterHoursChangePercent: 3.72,
        riseProbability: 65,
        reason:
          "시간외 거래대금 급증·기관 매수 포착 — 소형주 모멘텀 이어질 가능",
      },
    ],
  };
}

function buildHistoricalPrediction(
  sessionDate: string,
  targetDate: string,
  verified: boolean,
): ClosingBellPrediction {
  const picks = [
    {
      symbol: "082740",
      name: "한화엔진",
      sector: "조선/방산",
      regularClosePrice: 63100,
      afterHoursClosePrice: 64800,
      afterHoursChangePercent: 2.69,
      riseProbability: 74,
      reason: "시간외 수급 개선·유가 상승 연동",
    },
    {
      symbol: "005930",
      name: "삼성전자",
      sector: "반도체",
      regularClosePrice: 71200,
      afterHoursClosePrice: 71800,
      afterHoursChangePercent: 0.84,
      riseProbability: 62,
      reason: "시간외 외국인 소폭 순매수",
    },
    {
      symbol: "035720",
      name: "카카오",
      sector: "플랫폼",
      regularClosePrice: 45200,
      afterHoursClosePrice: 44800,
      afterHoursChangePercent: -0.88,
      riseProbability: 48,
      reason: "시간외 약세 마감·개장 갭 다운 우려",
    },
  ];

  const mockResults = [
    { open: 65500, high: 67200, close: 66500 },
    { open: 72000, high: 72500, close: 71900 },
    { open: 44500, high: 44600, close: 44100 },
  ];

  const marketCloseIso = getRegularMarketCloseIso(targetDate);

  return {
    id: `pred-${sessionDate}`,
    krAfterHoursClosedAt: getAfterHoursCloseIso(sessionDate),
    targetTradingDate: targetDate,
    nextDayMarketClosedAt: verified ? marketCloseIso : null,
    marketSummary:
      "시간외 단일가에서 조선·반도체 섹터 매수세 집중 — 익일 개장 강세 시나리오",
    picks,
    verifications: picks.map((pick, index) => {
      const baseline = pick.afterHoursClosePrice;
      const mock = mockResults[index];
      const maxGain = ((mock.high - baseline) / baseline) * 100;
      const success = maxGain >= 1;

      return {
        symbol: pick.symbol,
        name: pick.name,
        baselinePrice: baseline,
        baselineType: "after_hours_close" as const,
        nextDayOpen: verified ? mock.open : null,
        nextDayHigh: verified ? mock.high : null,
        nextDayClose: verified ? mock.close : null,
        maxGainPercent: verified ? maxGain : null,
        outcome: verified
          ? success
            ? ("success" as const)
            : ("failure" as const)
          : ("pending" as const),
        verifiedAt: verified ? marketCloseIso : null,
      };
    }),
    isArchived: false,
    archivedAt: null,
    createdAt: getAfterHoursCloseIso(sessionDate),
  };
}

export function getSeedPredictions(): ClosingBellPrediction[] {
  const sessionDate = getPredictionSessionDate();
  const targetDate = getNextTradingDate(
    new Date(getAfterHoursCloseIso(sessionDate)),
  );
  const prevSession = getPreviousTradingDate();
  const prevTarget = getNextTradingDate(
    new Date(getAfterHoursCloseIso(prevSession)),
  );

  const verified = buildHistoricalPrediction(prevSession, prevTarget, true);
  const pending = buildHistoricalPrediction(sessionDate, targetDate, false);

  if (prevSession === sessionDate) {
    return [pending];
  }

  return [pending, verified];
}
