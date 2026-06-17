import {
  buildSellAdviceCacheKey,
  getCachedSellAdvice,
  setCachedSellAdvice,
} from "@/lib/sell-advice-cache";
import {
  callLlmJson,
  hasLlmCredentials,
  resolveLlmProvider,
  type LlmProvider,
} from "@/lib/llm-briefing";
import type { SellCandidate } from "@/lib/sell-recommendation";
import { candidatesToRecommendations } from "@/lib/sell-recommendation";
import type { SellRecommendation } from "@/types/portfolio";

export interface LlmSellAdviceItem {
  holdingId: string;
  llmReason: string;
  upsideNote: string;
}

export interface LlmSellAdviceContent {
  cacheKey: string;
  items: LlmSellAdviceItem[];
}

const SYSTEM_PROMPT = `당신은 한국 개인투자자의 포트폴리오 매도 검토 코치입니다.
각 종목에 대해 당일 시세 흐름과 보유 손익을 바탕으로 짧은 조언을 작성합니다.

반드시 아래 JSON만 반환하세요.
{
  "items": [
    {
      "holdingId": "string",
      "llmReason": "string",
      "upsideNote": "string"
    }
  ]
}

규칙:
- 모든 문장은 한국어, 각 필드는 한 줄(40자 내외 권장)
- 손절(stop_loss)·하락 검토(decline_review): llmReason에 당일 등락·분봉 흐름을 반영해 왜 지금 매도/비중 축소를 검토해야 하는지 설명. upsideNote는 빈 문자열 ""
- 익절 검토(take_profit): llmReason에 익절을 검토할 핵심 이유 1줄. 추세상 추가 상승 여지가 있으면 upsideNote에 "↑ ..." 형태로 1줄, 없으면 ""
- 과장·확정적 예측 금지, 투자 참고용 톤
- 입력된 모든 holdingId에 대해 items를 반환`;

function describeSparkline(sparkline: number[]): string {
  if (sparkline.length < 2) return "당일 분봉 데이터 부족";

  const first = sparkline[0];
  const last = sparkline[sparkline.length - 1];
  const min = Math.min(...sparkline);
  const max = Math.max(...sparkline);
  const intradayChange = first > 0 ? ((last - first) / first) * 100 : 0;

  return `분봉 시가대비 ${intradayChange >= 0 ? "+" : ""}${intradayChange.toFixed(1)}%, 고가 ${Math.round(max).toLocaleString()}, 저가 ${Math.round(min).toLocaleString()}`;
}

function buildUserPrompt(candidates: SellCandidate[]): string {
  const nowKst = new Date().toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    dateStyle: "medium",
    timeStyle: "short",
  });

  const stocks = candidates
    .map((candidate) => {
      const h = candidate.holding;
      return [
        `- holdingId: ${h.id}`,
        `  종목: ${h.name} (${h.symbol})`,
        `  검토 유형: ${candidate.action} (${candidate.headline})`,
        `  매수가: ${Math.round(h.purchasePrice).toLocaleString()}원`,
        `  현재가: ${Math.round(h.currentPrice).toLocaleString()}원`,
        `  총 수익률: ${h.gainPercent >= 0 ? "+" : ""}${h.gainPercent.toFixed(2)}%`,
        `  세후·수수료 수익률: ${h.gainPercentAfterTax >= 0 ? "+" : ""}${h.gainPercentAfterTax.toFixed(2)}%`,
        `  당일 등락률: ${h.changePercent >= 0 ? "+" : ""}${h.changePercent.toFixed(2)}%`,
        `  당일 흐름: ${describeSparkline(h.sparkline)}`,
        `  규칙 요약: ${candidate.ruleReason}`,
      ].join("\n");
    })
    .join("\n\n");

  return `기준 시각(KST): ${nowKst}

아래 종목들의 매도 검토 조언을 작성하세요.

${stocks}`;
}

export function parseLlmSellAdviceContent(
  raw: unknown,
  cacheKey: string,
): LlmSellAdviceContent | null {
  if (!raw || typeof raw !== "object") return null;

  const payload = raw as Record<string, unknown>;
  const itemsRaw = payload.items;

  if (!Array.isArray(itemsRaw)) return null;

  const items: LlmSellAdviceItem[] = [];

  for (const entry of itemsRaw) {
    if (!entry || typeof entry !== "object") continue;

    const item = entry as Record<string, unknown>;
    const holdingId = item.holdingId;
    const llmReason = item.llmReason;
    const upsideNote = item.upsideNote;

    if (typeof holdingId !== "string" || typeof llmReason !== "string") {
      continue;
    }

    items.push({
      holdingId,
      llmReason: llmReason.trim(),
      upsideNote: typeof upsideNote === "string" ? upsideNote.trim() : "",
    });
  }

  if (items.length === 0) return null;

  return { cacheKey, items };
}

function fallbackDailyReason(candidate: SellCandidate): string {
  const h = candidate.holding;
  const trend = describeSparkline(h.sparkline);

  if (candidate.action === "stop_loss") {
    return `당일 ${h.changePercent >= 0 ? "+" : ""}${h.changePercent.toFixed(1)}%·${trend} — 손실 구간에서 반등 신호가 약함`;
  }

  if (candidate.action === "decline_review") {
    return `당일 ${h.changePercent >= 0 ? "+" : ""}${h.changePercent.toFixed(1)}%·${trend} — 하락 압력이 이어지는 흐름`;
  }

  return "";
}

export interface EnrichedSellAdviceResult {
  recommendations: SellRecommendation[];
  adviceSource: "llm" | "rule";
  llmProvider: LlmProvider | null;
  llmError?: string;
}

export async function enrichSellRecommendationsWithLlm(
  candidates: SellCandidate[],
): Promise<EnrichedSellAdviceResult> {
  const base = candidatesToRecommendations(candidates);

  if (candidates.length === 0) {
    return {
      recommendations: [],
      adviceSource: "rule",
      llmProvider: null,
    };
  }

  const cacheKey = buildSellAdviceCacheKey(
    candidates.map((c) => ({
      holdingId: c.holding.id,
      action: c.action,
      currentPrice: c.holding.currentPrice,
      changePercent: c.holding.changePercent,
    })),
  );

  const cached = getCachedSellAdvice();
  if (cached?.cacheKey === cacheKey) {
    return {
      recommendations: mergeAdvice(base, cached.items),
      adviceSource: "llm",
      llmProvider: resolveLlmProvider(),
    };
  }

  if (!hasLlmCredentials()) {
    return {
      recommendations: applyRuleFallback(base, candidates),
      adviceSource: "rule",
      llmProvider: null,
      llmError: "LLM API 키가 설정되지 않았습니다.",
    };
  }

  const result = await callLlmJson(
    SYSTEM_PROMPT,
    buildUserPrompt(candidates),
    (raw) => parseLlmSellAdviceContent(raw, cacheKey),
  );

  if (!result.data) {
    return {
      recommendations: applyRuleFallback(base, candidates),
      adviceSource: "rule",
      llmProvider: result.provider,
      llmError: result.error ?? "LLM 조언 생성에 실패했습니다.",
    };
  }

  setCachedSellAdvice(result.data);

  return {
    recommendations: mergeAdvice(base, result.data.items),
    adviceSource: "llm",
    llmProvider: result.provider,
  };
}

function mergeAdvice(
  base: SellRecommendation[],
  items: LlmSellAdviceItem[],
): SellRecommendation[] {
  const adviceMap = new Map(items.map((item) => [item.holdingId, item]));

  return base.map((rec) => {
    const advice = adviceMap.get(rec.holdingId);
    if (!advice) return rec;

    return {
      ...rec,
      llmReason: advice.llmReason || undefined,
      upsideNote: advice.upsideNote || undefined,
      adviceSource: "llm" as const,
    };
  });
}

function applyRuleFallback(
  base: SellRecommendation[],
  candidates: SellCandidate[],
): SellRecommendation[] {
  const candidateMap = new Map(
    candidates.map((c) => [c.holding.id, c] as const),
  );

  return base.map((rec) => {
    const candidate = candidateMap.get(rec.holdingId);
    if (!candidate) return rec;

    if (candidate.action === "take_profit") {
      const h = candidate.holding;
      const upsideNote =
        h.changePercent >= 3
          ? `↑ 당일 +${h.changePercent.toFixed(1)}% 강세 — 추세 유지 시 추가 상승 여지`
          : undefined;

      return {
        ...rec,
        llmReason: `수익 ${h.gainPercent >= 0 ? "+" : ""}${h.gainPercent.toFixed(1)}% 구간에서 일부 실현 검토`,
        upsideNote,
      };
    }

    return {
      ...rec,
      llmReason: fallbackDailyReason(candidate),
    };
  });
}
