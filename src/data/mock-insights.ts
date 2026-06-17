import type { InsightsMockData, MacroImpactHolding } from "@/types/insights";

/** 종목코드별 매크로 메타데이터 (보유 종목과 매칭용) */
export type MacroMetadataTemplate = Omit<
  MacroImpactHolding,
  "id" | "name" | "symbol" | "market"
>;

export const macroMetadataCatalog: Record<string, MacroMetadataTemplate> = {
  "005930": {
    macroSensitivity: "high",
    sensitivityScore: 88,
    connectedIssues: [
      "#필라델피아반도체지수",
      "#미국금리",
      "#반도체공급망",
      "#미중기술갈등",
    ],
    trend: "up",
    aiComment:
      "밤사이 SOX +1.8%·엔비디아 실적 기대감으로 반도체 베타가 확대되는 흐름입니다.",
    strategyHint:
      "환율 급등 구간에서는 수출주 모멘텀은 유지되나 변동성 확대 — 분할 대응",
  },
  "082740": {
    macroSensitivity: "high",
    sensitivityScore: 82,
    connectedIssues: [
      "#국제유가",
      "#중동지정학",
      "#조선수주사이클",
      "#원달러환율",
    ],
    trend: "up",
    aiComment:
      "유가 상승·중동 리스크 프리미엄이 조선·엔진 밸류체인에 우호적으로 작용 중입니다.",
    strategyHint:
      "유가 급락 시 되돌림 가능 — 수주 모멘텀 확인 후 비중 유지",
  },
  "005380": {
    macroSensitivity: "high",
    sensitivityScore: 79,
    connectedIssues: [
      "#원달러환율",
      "#미국소비자물가지수",
      "#전기차보조금",
      "#미국금리",
    ],
    trend: "side",
    aiComment:
      "환율·금리 민감도가 높아 CPI 발표 전후 박스권 흔들림이 예상됩니다.",
    strategyHint: "금리 인하 기대 재점화 시 자동차·부품 동반 반등 여지",
  },
  "458870": {
    macroSensitivity: "low",
    sensitivityScore: 34,
    connectedIssues: ["#국내금리", "#헬스케어규제", "#바이오투자심리"],
    trend: "up",
    aiComment:
      "글로벌 매크로 직접 연관은 낮고, 국내 수급·실적 모멘텀이 주가를 주도합니다.",
    strategyHint: "매크로 이벤트보다 실적·수가 이슈에 집중",
  },
  "000660": {
    macroSensitivity: "high",
    sensitivityScore: 91,
    connectedIssues: [
      "#필라델피아반도체지수",
      "#HBM수요",
      "#미국금리",
      "#달러강세",
    ],
    trend: "up",
    aiComment:
      "AI 메모리 수요 기대와 금리 민감도가 겹쳐 해외 반도체 흐름에 고베타로 반응합니다.",
    strategyHint: "SOX 조정 시 변동성 확대 — 장기 테마와 단기 매크로 분리 관점",
  },
  "035420": {
    macroSensitivity: "medium",
    sensitivityScore: 58,
    connectedIssues: [
      "#나스닥성장주",
      "#원달러환율",
      "#글로벌광고경기",
      "#AI투자심리",
    ],
    trend: "down",
    aiComment:
      "나스닥 성장주 약세·환율 부담이 플랫폼주 밸류에이션에 단기 압력으로 작용합니다.",
    strategyHint: "미국 성장주 반등 시 베타 회복 가능 — 실적 가이던스 확인",
  },
};

export const mockInsights: InsightsMockData = {
  blindSpotSectors: [
    {
      id: "blind-1",
      sector: "조선/방산",
      market: "KR",
      isOwned: false,
      portfolioWeightPercent: 0,
      insight:
        "회원님은 현재 '조선/방산' 섹터 비중이 없습니다. 최근 수주 모멘텀 대비 일부 종목이 저평가된 상태입니다.",
      recommendations: [
        {
          symbol: "010140",
          name: "삼성중공업",
          market: "KR",
          sector: "조선/방산",
          per: 12.4,
          pbr: 0.9,
          discountPercent: 18,
          isOwned: false,
          reason: "LNG선 수주 사이클 대비 PER·PBR 이중 할인",
        },
        {
          symbol: "042660",
          name: "한화오션",
          market: "KR",
          sector: "조선/방산",
          per: 14.1,
          pbr: 1.1,
          discountPercent: 15,
          isOwned: false,
          reason: "방산·상선 수주 모멘텀 대비 밸류에이션 부담 낮음",
        },
      ],
    },
    {
      id: "blind-2",
      sector: "2차전지/소재",
      market: "KR",
      isOwned: false,
      portfolioWeightPercent: 2.1,
      insight:
        "2차전지 섹터 비중이 2%대로 낮습니다. 전기차 수요 둔화로 낙폭이 과대한 소재주가 있습니다.",
      recommendations: [
        {
          symbol: "003670",
          name: "포스코퓨처엠",
          market: "KR",
          sector: "2차전지/소재",
          per: 22.5,
          pbr: 1.4,
          discountPercent: 24,
          isOwned: false,
          reason: "양극재 사이클 저점 대비 PER 하락·섹터 평균 대비 할인",
        },
        {
          symbol: "006400",
          name: "삼성SDI",
          market: "KR",
          sector: "2차전지/소재",
          per: 18.2,
          pbr: 0.8,
          discountPercent: 20,
          isOwned: false,
          reason: "ESS 수요 기대 대비 PBR 부담 낮은 대형주",
        },
      ],
    },
    {
      id: "blind-4",
      sector: "바이오/헬스케어",
      market: "KR",
      isOwned: true,
      portfolioWeightPercent: 8.5,
      insight:
        "바이오 비중은 있으나 대형 바이오 대비 중소형 헬스케어는 소외된 상태입니다. 방어적 섹터 내 로테이션 여지가 있습니다.",
      recommendations: [
        {
          symbol: "207940",
          name: "삼성바이오로직스",
          market: "KR",
          sector: "바이오/헬스케어",
          per: 45.2,
          pbr: 6.8,
          discountPercent: 8,
          isOwned: false,
          reason: "CDMO 수주 가시성 대비 최근 조정으로 상대적 저평가",
        },
        {
          symbol: "068270",
          name: "셀트리온",
          market: "KR",
          sector: "바이오/헬스케어",
          per: 28.6,
          pbr: 2.1,
          discountPercent: 14,
          isOwned: false,
          reason: "바이오시밀러 파이프라인 대비 섹터 내 PER 할인",
        },
      ],
    },
  ],
};
