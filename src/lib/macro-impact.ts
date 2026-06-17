import { macroMetadataCatalog } from "@/data/mock-insights";
import type { MacroImpactHolding, WeekTrend } from "@/types/insights";
import type { LiveHolding } from "@/types/portfolio";

function inferTrendFromSparkline(sparkline: number[]): WeekTrend | null {
  if (sparkline.length < 2) return null;

  const first = sparkline[0];
  const last = sparkline[sparkline.length - 1];
  if (first <= 0) return null;

  const change = ((last - first) / first) * 100;
  if (change >= 1) return "up";
  if (change <= -1) return "down";
  return "side";
}

function inferTrend(holding: LiveHolding): WeekTrend {
  const fromSparkline = inferTrendFromSparkline(holding.sparkline);
  if (fromSparkline) return fromSparkline;

  if (holding.changePercent >= 1.5) return "up";
  if (holding.changePercent <= -1.5) return "down";
  return "side";
}

function buildFallbackMacro(holding: LiveHolding): Omit<
  MacroImpactHolding,
  "id"
> {
  const trend = inferTrend(holding);
  const sign = holding.changePercent >= 0 ? "+" : "";

  return {
    symbol: holding.symbol,
    name: holding.name,
    market: holding.market,
    macroSensitivity: "medium",
    sensitivityScore: 50,
    connectedIssues: ["#원달러환율", "#미국금리", "#국제유가"],
    trend,
    aiComment: `당일 ${sign}${holding.changePercent.toFixed(1)}% — 글로벌 매크로 이벤트에 따른 단기 변동성에 주의가 필요합니다.`,
    strategyHint:
      "FOMC·CPI 등 주요 지표 일정을 확인하며 비중을 조절하세요.",
  };
}

export function buildMacroImpactHoldings(
  holdings: LiveHolding[],
): MacroImpactHolding[] {
  return holdings.map((holding) => {
    const template = macroMetadataCatalog[holding.symbol];
    const trend = inferTrend(holding);

    if (!template) {
      return { id: holding.id, ...buildFallbackMacro(holding) };
    }

    return {
      id: holding.id,
      symbol: holding.symbol,
      name: holding.name,
      market: holding.market,
      ...template,
      trend,
      aiComment: template.aiComment,
      strategyHint: template.strategyHint,
    };
  });
}

export function sortByMacroSensitivity(
  holdings: MacroImpactHolding[],
): MacroImpactHolding[] {
  return [...holdings].sort((a, b) => b.sensitivityScore - a.sensitivityScore);
}
