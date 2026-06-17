import type { MorningBriefingData } from "@/types/briefing";

export const mockBriefing: MorningBriefingData = {
  updatedAt: "2026-06-17T06:00:00+09:00",
  usIndices: [
    { name: "S&P 500", value: 5487.32, changePercent: 0.82 },
    { name: "NASDAQ", value: 17842.15, changePercent: 1.24 },
    { name: "DOW", value: 39128.45, changePercent: 0.31 },
  ],
  overnightIssues: [
    {
      id: "issue-1",
      title: "엔비디아 실적 가이던스 상향",
      summary:
        "AI 데이터센터 수요 확대로 매출 전망을 상향 조정하며 반도체 섹터 전반에 긍정적 모멘텀을 전달했습니다.",
    },
    {
      id: "issue-2",
      title: "Fed 위원 매파적 발언",
      summary:
        "인플레이션 재가속 우려를 언급하며 금리 인하 시점이 지연될 수 있다는 시그널을 보냈습니다.",
    },
    {
      id: "issue-3",
      title: "미국 바이오 대형주 약세",
      summary:
        "비만치료제 경쟁 심화와 마진 압박 우려로 헬스케어 섹터가 전반적으로 조정을 받았습니다.",
    },
  ],
  themeForecasts: [
    {
      id: "theme-1",
      usTrigger: "미국 반도체주 강세 (NVDA +3.1%)",
      krTheme: "국내 반도체 소부장·장비 테마 주목",
      impact: "positive",
      relatedStocks: ["삼성전자", "SK하이닉스", "한미반도체"],
    },
    {
      id: "theme-2",
      usTrigger: "Fed 금리 인하 지연 시그널",
      krTheme: "성장주 밸류에이션 부담, 금융·배당주 상대적 선호",
      impact: "neutral",
      relatedStocks: ["KB금융", "신한지주", "삼성전자우"],
    },
    {
      id: "theme-3",
      usTrigger: "미국 헬스케어 하락 (LLY -2.2%)",
      krTheme: "국내 바이오 차익매물·단기 조정 주의",
      impact: "negative",
      relatedStocks: ["삼성바이오로직스", "셀트리온", "유한양행"],
    },
  ],
};
