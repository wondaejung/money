import {
  callLlmJson,
  hasLlmCredentials,
  resolveLlmProvider,
  type LlmProvider,
} from "@/lib/llm-briefing";
import {
  getCachedClosingBellLlm,
  setCachedClosingBellLlm,
} from "@/lib/closing-bell-llm-cache";
import { formatLlmErrorMessage, isGroqRateLimited } from "@/lib/llm-groq";
import { compressAfterHoursCandidate } from "@/lib/llm-payload-compress";
import { buildJsonSystemPrompt } from "@/lib/llm-prompt";
import type { AfterHoursCandidate } from "@/lib/closing-bell-naver";
import type { AfterHoursPick, TodayAfterHoursSnapshot } from "@/types/prediction";

export interface LlmClosingBellContent {
  marketSummary: string;
  picks: Array<{
    symbol: string;
    sector: string;
    riseProbability: number;
    reason: string;
  }>;
}

const SYSTEM_PROMPT = buildJsonSystemPrompt({
  role: "한국 주식 시간외 단일가(18:00) 데이터로 다음 거래일(09:00) 강세 종목 3개 추천.",
  schema: `{
  "marketSummary": "string",
  "picks": [
    { "symbol": "6자리코드", "sector": "string", "riseProbability": number, "reason": "string" }
  ]
}`,
  rules: [
    "picks 정확히 3개, 입력 후보 symbol만 사용",
    "marketSummary 한 문장",
    "riseProbability 40~90 정수",
    "reason 한 줄",
  ],
});

function buildUserPrompt(
  sessionDate: string,
  targetDate: string,
  candidates: AfterHoursCandidate[],
): string {
  const list = candidates
    .slice(0, 8)
    .map((candidate) => compressAfterHoursCandidate(candidate))
    .join("\n");

  return `AH_CLOSE ${sessionDate} TGT ${targetDate}\n${list}`;
}

export function parseLlmClosingBellContent(
  raw: unknown,
): LlmClosingBellContent | null {
  if (!raw || typeof raw !== "object") return null;

  const payload = raw as Record<string, unknown>;
  const marketSummary = payload.marketSummary;
  const picksRaw = payload.picks;

  if (typeof marketSummary !== "string" || !Array.isArray(picksRaw)) {
    return null;
  }

  const picks: LlmClosingBellContent["picks"] = [];

  for (const entry of picksRaw) {
    if (!entry || typeof entry !== "object") continue;
    const item = entry as Record<string, unknown>;

    if (
      typeof item.symbol !== "string" ||
      typeof item.sector !== "string" ||
      typeof item.reason !== "string" ||
      typeof item.riseProbability !== "number"
    ) {
      continue;
    }

    picks.push({
      symbol: item.symbol,
      sector: item.sector,
      riseProbability: Math.round(
        Math.min(90, Math.max(40, item.riseProbability)),
      ),
      reason: item.reason.trim(),
    });
  }

  if (picks.length === 0) return null;

  return {
    marketSummary: marketSummary.trim(),
    picks: picks.slice(0, 3),
  };
}

export function mergeLlmWithCandidates(
  llm: LlmClosingBellContent,
  candidates: AfterHoursCandidate[],
  base: TodayAfterHoursSnapshot,
): TodayAfterHoursSnapshot {
  const candidateMap = new Map(candidates.map((c) => [c.symbol, c]));

  const picks: AfterHoursPick[] = llm.picks
    .map((pick) => {
      const quote = candidateMap.get(pick.symbol);
      if (!quote) return null;

      return {
        symbol: quote.symbol,
        name: quote.name,
        sector: pick.sector,
        regularClosePrice: quote.regularClosePrice,
        afterHoursClosePrice: quote.afterHoursClosePrice,
        afterHoursChangePercent: quote.afterHoursChangePercent,
        riseProbability: pick.riseProbability,
        reason: pick.reason,
      };
    })
    .filter((pick): pick is AfterHoursPick => pick !== null);

  if (picks.length === 0) return base;

  while (picks.length < 3 && base.picks[picks.length]) {
    picks.push(base.picks[picks.length]);
  }

  return {
    ...base,
    marketSummary: llm.marketSummary,
    picks: picks.slice(0, 3),
  };
}

export interface LlmClosingBellResult {
  snapshot: TodayAfterHoursSnapshot;
  predictionSource: "llm" | "rule";
  llmProvider: LlmProvider | null;
  llmError?: string;
  rateLimited?: boolean;
}

export async function generateClosingBellSnapshot(
  sessionDate: string,
  targetDate: string,
  closedAtIso: string,
  candidates: AfterHoursCandidate[],
  ruleSnapshot: TodayAfterHoursSnapshot,
  sessionKey: string,
): Promise<LlmClosingBellResult> {
  if (!hasLlmCredentials() || candidates.length === 0) {
    return {
      snapshot: ruleSnapshot,
      predictionSource: "rule",
      llmProvider: null,
      llmError: hasLlmCredentials()
        ? undefined
        : "LLM API 키가 설정되지 않았습니다.",
    };
  }

  if (isGroqRateLimited()) {
    return {
      snapshot: ruleSnapshot,
      predictionSource: "rule",
      llmProvider: "groq",
      llmError:
        "Groq 일일 토큰 한도 초과 — 규칙 기반으로 표시합니다.",
      rateLimited: true,
    };
  }

  const cachedLlm = getCachedClosingBellLlm(sessionKey);
  if (cachedLlm) {
    return {
      snapshot: mergeLlmWithCandidates(cachedLlm, candidates, ruleSnapshot),
      predictionSource: "llm",
      llmProvider: resolveLlmProvider(),
    };
  }

  const result = await callLlmJson(
    SYSTEM_PROMPT,
    buildUserPrompt(sessionDate, targetDate, candidates),
    parseLlmClosingBellContent,
  );

  if (!result.data) {
    const rawError = result.error ?? "LLM 예측 생성 실패";
    return {
      snapshot: ruleSnapshot,
      predictionSource: "rule",
      llmProvider: result.provider,
      llmError: formatLlmErrorMessage(rawError),
      rateLimited: isGroqRateLimited(),
    };
  }

  setCachedClosingBellLlm(sessionKey, result.data);

  return {
    snapshot: mergeLlmWithCandidates(result.data, candidates, ruleSnapshot),
    predictionSource: "llm",
    llmProvider: result.provider,
  };
}
