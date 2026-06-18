import { mockUndervaluedPicks } from "@/data/mock-undervalued";
import { UNDERVALUED_THEME_LABELS } from "@/types/undervalued";
import type { UndervaluedTheme } from "@/types/undervalued";

export interface UndervaluedUniverseEntry {
  ticker: string;
  name: string;
  theme: UndervaluedTheme;
  themeLabel: string;
  baselinePrice: number;
  baselinePer: number;
  sectorAvgPer: number;
  baselinePbr: number;
  baselineRoe: number;
  reason: string;
  catalyst: string;
  expectedTimeline: string;
  seedId?: string;
}

const EXTRA_UNIVERSE: Array<{
  ticker: string;
  name: string;
  theme: UndervaluedTheme;
  sectorAvgPer: number;
}> = [
  { ticker: "035720", name: "카카오", theme: "platform", sectorAvgPer: 28.2 },
  { ticker: "051910", name: "LG화학", theme: "battery", sectorAvgPer: 42.0 },
  { ticker: "006400", name: "삼성SDI", theme: "battery", sectorAvgPer: 42.0 },
  { ticker: "012330", name: "현대모비스", theme: "auto", sectorAvgPer: 9.8 },
  { ticker: "028260", name: "삼성물산", theme: "finance", sectorAvgPer: 8.9 },
  { ticker: "003550", name: "LG", theme: "platform", sectorAvgPer: 28.2 },
  { ticker: "086520", name: "에코프로", theme: "battery", sectorAvgPer: 42.0 },
  { ticker: "010140", name: "삼성중공업", theme: "auto", sectorAvgPer: 9.8 },
  { ticker: "003670", name: "포스코퓨처엠", theme: "battery", sectorAvgPer: 42.0 },
];

function fromSeed(
  pick: (typeof mockUndervaluedPicks)[number],
): UndervaluedUniverseEntry {
  return {
    ticker: pick.ticker,
    name: pick.name,
    theme: pick.theme,
    themeLabel: pick.themeLabel,
    baselinePrice: pick.currentPrice,
    baselinePer: pick.per,
    sectorAvgPer: pick.sectorAvgPer,
    baselinePbr: pick.pbr,
    baselineRoe: pick.roe,
    reason: pick.reason,
    catalyst: pick.catalyst,
    expectedTimeline: pick.expectedTimeline,
    seedId: pick.id,
  };
}

function buildUniverseMap(): Map<string, UndervaluedUniverseEntry> {
  const map = new Map<string, UndervaluedUniverseEntry>();

  for (const pick of mockUndervaluedPicks.filter((item) => item.market === "KR")) {
    map.set(pick.ticker, fromSeed(pick));
  }

  for (const extra of EXTRA_UNIVERSE) {
    if (map.has(extra.ticker)) continue;

    map.set(extra.ticker, {
      ticker: extra.ticker,
      name: extra.name,
      theme: extra.theme,
      themeLabel: UNDERVALUED_THEME_LABELS[extra.theme],
      baselinePrice: 0,
      baselinePer: 0,
      sectorAvgPer: extra.sectorAvgPer,
      baselinePbr: 0,
      baselineRoe: 0,
      reason: `${extra.name} — 업종 평균 PER 대비 밸류에이션을 실시간으로 점검 중입니다.`,
      catalyst: "실적 개선 또는 섹터 리레이팅 시 재평가 가능.",
      expectedTimeline: "다음 분기 실적 시즌",
    });
  }

  return map;
}

export const UNDERVALUED_UNIVERSE = buildUniverseMap();

export const UNDERVALUED_SCREEN_TICKERS = [
  ...mockUndervaluedPicks.filter((item) => item.market === "KR").map((pick) => pick.ticker),
  ...EXTRA_UNIVERSE.map((item) => item.ticker),
].filter((ticker, index, tickers) => tickers.indexOf(ticker) === index);

export const UNDERVALUED_UNIVERSE_TICKERS = UNDERVALUED_SCREEN_TICKERS;
