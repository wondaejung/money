import {
  callLlmJson,
  hasLlmCredentials,
  resolveLlmProvider,
  type LlmProvider,
} from "@/lib/llm-briefing";
import {
  getLlmCacheAsync,
  setLlmCacheAsync,
} from "@/lib/llm-cache";
import { compressAfterHoursCandidate } from "@/lib/llm-payload-compress";
import { buildJsonSystemPrompt } from "@/lib/llm-prompt";
import type { AfterHoursCandidate } from "@/lib/closing-bell-naver";
import type { DailyMarketReport } from "@/types/daily-report";

export interface LlmDailyReportContent {
  headline: string;
  facts: string[];
  portfolioImpact: string;
}

const MAX_FACT_CHARS = 50;

const SYSTEM_PROMPT = buildJsonSystemPrompt({
  role: "한국 증시 일일 마감 리포트. 장중 이슈와 시간외 단일가 마감 데이터를 바탕으로 당일 핵심 3사건 요약.",
  schema: `{
  "headline": "string",
  "facts": ["string", "string", "string"],
  "portfolioImpact": "string"
}`,
  rules: [
    "facts 정확히 3개",
    `각 fact는 공백 포함 ${MAX_FACT_CHARS}자 이내(초과 금지)`,
    "headline 한 줄, 시장을 뒤흔든 최대 이슈",
    "portfolioImpact 한 줄, 보유 종목명을 자연스럽게 언급(보유 없으면 일반 시장 영향)",
    "입력 데이터에 없는 종목·수치 창작 금지",
  ],
});

function truncateFact(text: string): string {
  const trimmed = text.trim();
  if (trimmed.length <= MAX_FACT_CHARS) return trimmed;
  return `${trimmed.slice(0, MAX_FACT_CHARS - 1)}…`;
}

function buildUserPrompt(
  targetDate: string,
  kospiChange: number,
  kosdaqChange: number,
  candidates: AfterHoursCandidate[],
  holdings: Array<{ symbol: string; name: string }>,
): string {
  const indices = `IDX KOSPI:${kospiChange.toFixed(2)} KOSDAQ:${kosdaqChange.toFixed(2)}`;
  const movers = candidates
    .slice(0, 8)
    .map((candidate) => compressAfterHoursCandidate(candidate))
    .join("\n");
  const portfolio =
    holdings.length > 0
      ? holdings.map((h) => `${h.symbol}|${h.name}`).join(",")
      : "none";

  return `DATE ${targetDate}\n${indices}\nMOVERS\n${movers}\nHOLD ${portfolio}`;
}

export function parseLlmDailyReportContent(
  raw: unknown,
): LlmDailyReportContent | null {
  if (!raw || typeof raw !== "object") return null;

  const payload = raw as Record<string, unknown>;
  const headline = payload.headline;
  const factsRaw = payload.facts;
  const portfolioImpact = payload.portfolioImpact;

  if (
    typeof headline !== "string" ||
    !Array.isArray(factsRaw) ||
    typeof portfolioImpact !== "string"
  ) {
    return null;
  }

  const facts = factsRaw
    .filter((fact): fact is string => typeof fact === "string")
    .map(truncateFact)
    .slice(0, 3);

  if (facts.length < 3) return null;

  return {
    headline: headline.trim(),
    facts,
    portfolioImpact: portfolioImpact.trim(),
  };
}

function buildRuleBasedContent(
  kospiChange: number,
  kosdaqChange: number,
  candidates: AfterHoursCandidate[],
  holdings: Array<{ symbol: string; name: string }>,
): LlmDailyReportContent {
  const indexDir = kospiChange >= 0 ? "상승" : "하락";
  const headline = `코스피 ${Math.abs(kospiChange).toFixed(2)}% ${indexDir} 마감, 코스닥 ${kosdaqChange >= 0 ? "+" : ""}${kosdaqChange.toFixed(2)}%`;

  const top = candidates.slice(0, 3);
  const facts = (top.length >= 3
    ? top.map(
        (c) =>
          `${c.name} ${c.afterHoursChangePercent >= 0 ? "+" : ""}${c.afterHoursChangePercent.toFixed(1)}%`,
      )
    : [
        `코스피 ${kospiChange.toFixed(1)}%`,
        `코스닥 ${kosdaqChange.toFixed(1)}%`,
        top[0]
          ? `${top[0].name} 주목`
          : "시장 변동성 확대",
      ]
  ).map(truncateFact) as [string, string, string];

  const matched = holdings.filter((h) =>
    candidates.some((c) => c.symbol === h.symbol),
  );

  const portfolioImpact =
    matched.length > 0
      ? `오늘 흐름은 보유 ${matched.map((h) => h.name).join("/")}에 ${kospiChange >= 0 ? "순풍" : "역풍"} 요인으로 작용할 수 있습니다.`
      : "보유 종목 직접 연관 이슈는 제한적이며 지수 흐름을 참고하세요.";

  return { headline, facts, portfolioImpact };
}

export interface GenerateDailyReportResult {
  content: LlmDailyReportContent;
  reportSource: "llm" | "rule";
  llmProvider: LlmProvider | null;
  llmError?: string;
}

export async function generateDailyReportContent(
  cacheKey: string,
  targetDate: string,
  kospiChange: number,
  kosdaqChange: number,
  candidates: AfterHoursCandidate[],
  holdings: Array<{ symbol: string; name: string }>,
): Promise<GenerateDailyReportResult> {
  const ruleFallback = buildRuleBasedContent(
    kospiChange,
    kosdaqChange,
    candidates,
    holdings,
  );

  if (!hasLlmCredentials()) {
    return {
      content: ruleFallback,
      reportSource: "rule",
      llmProvider: resolveLlmProvider(),
    };
  }

  const cached = await getLlmCacheAsync<LlmDailyReportContent>(cacheKey);
  if (cached) {
    return {
      content: {
        headline: cached.headline,
        facts: cached.facts.slice(0, 3).map(truncateFact) as [
          string,
          string,
          string,
        ],
        portfolioImpact: cached.portfolioImpact,
      },
      reportSource: "llm",
      llmProvider: resolveLlmProvider(),
    };
  }

  const userPrompt = buildUserPrompt(
    targetDate,
    kospiChange,
    kosdaqChange,
    candidates,
    holdings,
  );

  const llmResult = await callLlmJson(
    SYSTEM_PROMPT,
    userPrompt,
    parseLlmDailyReportContent,
  );

  if (llmResult.data) {
    const facts = llmResult.data.facts.slice(0, 3).map(truncateFact) as [
      string,
      string,
      string,
    ];
    const normalized = {
      headline: llmResult.data.headline,
      facts,
      portfolioImpact: llmResult.data.portfolioImpact,
    };
    await setLlmCacheAsync(cacheKey, normalized);

    return {
      content: normalized,
      reportSource: "llm",
      llmProvider: llmResult.provider,
    };
  }

  return {
    content: ruleFallback,
    reportSource: "rule",
    llmProvider: llmResult.provider,
    llmError: llmResult.error,
  };
}

export function toDailyMarketReport(
  targetDate: string,
  closedAtLabel: string,
  result: GenerateDailyReportResult,
): DailyMarketReport {
  return {
    targetDate,
    headline: result.content.headline,
    facts: result.content.facts as [string, string, string],
    portfolioImpact: result.content.portfolioImpact,
    reportSource: result.reportSource,
    llmProvider: result.llmProvider,
    llmError: result.llmError,
    publishedAt: new Date().toISOString(),
    closedAtLabel,
  };
}
