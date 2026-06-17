import {
  callLlmJson,
  hasLlmCredentials,
  type LlmProvider,
} from "@/lib/llm-briefing";
import { formatLlmErrorMessage, isGroqRateLimited } from "@/lib/llm-groq";
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

const SYSTEM_PROMPT = `당신은 한국 주식 시간외 단일가(18:00 마감) 데이터를 분석해 다음 거래일(09:00 개장) 강세 종목을 추천하는 애널리스트입니다.

반드시 아래 JSON만 반환하세요.
{
  "marketSummary": "string",
  "picks": [
    {
      "symbol": "6자리 종목코드",
      "sector": "string",
      "riseProbability": number,
      "reason": "string"
    }
  ]
}

규칙:
- picks는 정확히 3개, 입력 후보 목록에 있는 symbol만 사용
- marketSummary: 시간외 마감 배경을 한 문장으로 (예: "오후 6시 단일가에서 OO 섹터 거래량 급증 → 내일 아침 강세 예상")
- riseProbability: 40~90 정수 (과장 금지)
- reason: 시간외 가격·수급 근거 한 줄
- 한국어, 투자 참고용 톤`;

function buildUserPrompt(
  sessionDate: string,
  targetDate: string,
  candidates: AfterHoursCandidate[],
): string {
  const nowKst = new Date().toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    dateStyle: "medium",
    timeStyle: "short",
  });

  const list = candidates
    .slice(0, 8)
    .map(
      (c) =>
        `- ${c.name} (${c.symbol}): 정규장 종가 ${c.regularClosePrice.toLocaleString()}원, 시간외 ${c.afterHoursClosePrice.toLocaleString()}원 (${c.afterHoursChangePercent >= 0 ? "+" : ""}${c.afterHoursChangePercent.toFixed(2)}%), 정규장 등락 ${c.regularChangePercent.toFixed(2)}%`,
    )
    .join("\n");

  return `기준 시각(KST): ${nowKst}
시간외 마감일: ${sessionDate} 18:00
검증 대상 거래일: ${targetDate} 09:00 개장

시간외 후보 종목:
${list}

위 데이터로 다음 거래일 개장 강세 가능성이 높은 TOP 3를 고르세요.`;
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

  return {
    snapshot: mergeLlmWithCandidates(result.data, candidates, ruleSnapshot),
    predictionSource: "llm",
    llmProvider: result.provider,
  };
}
