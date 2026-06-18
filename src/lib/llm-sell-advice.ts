import {
  buildSellAdviceCacheKey,
  getCachedSellAdviceByKey,
  setCachedSellAdvice,
} from "@/lib/sell-advice-cache";
import {
  callLlmJson,
  hasLlmCredentials,
  resolveLlmProvider,
  type LlmProvider,
} from "@/lib/llm-briefing";
import { compressSellCandidate } from "@/lib/llm-payload-compress";
import { buildJsonSystemPrompt } from "@/lib/llm-prompt";
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

const SYSTEM_PROMPT = buildJsonSystemPrompt({
  role: "포트폴리오 매도 검토 코치. 입력 종목별 짧은 조언만 생성.",
  schema: `{
  "items": [
    { "holdingId": "string", "llmReason": "string", "upsideNote": "string" }
  ]
}`,
  rules: [
    "한국어, 각 필드 1줄·40자 내외",
    "stop_loss·decline_review: llmReason에 당일 등락·분봉 반영, upsideNote는 빈 문자열",
    "take_profit: llmReason 1줄, 추가 상승 여지 있으면 upsideNote에 ↑ 1줄",
    "입력 holdingId 전부 포함",
  ],
});

function buildUserPrompt(candidates: SellCandidate[]): string {
  const lines = candidates.map((candidate) => {
    const h = candidate.holding;
    return compressSellCandidate({
      holdingId: h.id,
      symbol: h.symbol,
      action: candidate.action,
      purchasePrice: h.purchasePrice,
      currentPrice: h.currentPrice,
      gainPercent: h.gainPercent,
      changePercent: h.changePercent,
      sparkline: h.sparkline,
    });
  });

  return `SELL_REVIEW\n${lines.join("\n")}`;
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
  const change = `${h.changePercent >= 0 ? "+" : ""}${h.changePercent.toFixed(1)}%`;

  if (candidate.action === "stop_loss") {
    return `당일 ${change} — 손실 구간에서 반등 신호가 약함`;
  }

  if (candidate.action === "decline_review") {
    return `당일 ${change} — 하락 압력이 이어지는 흐름`;
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
    })),
  );

  const cached = getCachedSellAdviceByKey(cacheKey);
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
