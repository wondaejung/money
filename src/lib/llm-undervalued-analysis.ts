import {
  callLlmJson,
  hasLlmCredentials,
  resolveLlmProvider,
  type LlmProvider,
} from "@/lib/llm-briefing";
import { getLlmCacheAsync, setLlmCacheAsync } from "@/lib/llm-cache";
import { buildJsonSystemPrompt } from "@/lib/llm-prompt";
import {
  fetchNaverKrDisclosures,
  fetchNaverKrFinanceAnnual,
  fetchNaverKrFinanceQuarter,
} from "@/lib/naver-kr-finance";
import {
  buildUndervaluedFinanceContext,
  type UndervaluedAnalysisInput,
} from "@/lib/undervalued-finance-context";
import type {
  UndervaluedDeepAnalysis,
  ValueTrapRisk,
} from "@/types/undervalued-analysis";

const VALID_RISKS = new Set<ValueTrapRisk>(["low", "medium", "high"]);

const SYSTEM_PROMPT = buildJsonSystemPrompt({
  role:
    "한국 주식 저평가 심층 분석가. 재무제표 추이와 DART 공시를 바탕으로 밸류 트랩 여부와 반등 촉매를 판단.",
  schema: `{
  "valueTrapRisk": "low" | "medium" | "high",
  "reason": "string",
  "catalyst": "string",
  "expectedTimeline": "string",
  "financialHighlights": [
    { "label": "string", "detail": "string", "signal": "positive" | "negative" | "neutral" }
  ],
  "disclosureNotes": [
    { "date": "string", "title": "string", "impact": "string", "category": "string" }
  ],
  "keyWatchpoints": ["string"]
}`,
  rules: [
    "한국어",
    "입력 재무·공시·밸류에이션 데이터에 근거, 없는 수치·이벤트 창작 금지",
    "reason: PER/PBR 대비 업종 할인 + 재무제표 핵심(매출·영업이익·ROE·부채 등) 근거 2~3문장",
    "catalyst: 공시·실적·배당·IR 등 구체 이벤트 기반 1~2문장",
    "expectedTimeline: 분기 실적·공시 일정 등 현실적 시점",
    "financialHighlights 3~5개, 업종 특성에 맞는 지표 우선",
    "disclosureNotes 2~4개, 시장가격에 영향 큰 공시만",
    "keyWatchpoints 2~3개, 투자자가 모니터링할 체크리스트",
    "밸류 트랩: 이익 둔화·부채 악화·희석 공시가 있으면 medium/high",
  ],
});

function buildCacheKey(input: UndervaluedAnalysisInput): string {
  return `undervalued-analysis:${input.ticker}:${input.theme}`;
}

function buildUserPrompt(
  context: ReturnType<typeof buildUndervaluedFinanceContext>,
): string {
  const { input, compressedFinance, compressedDisclosures } = context;

  return [
    `STOCK ${input.ticker}|${input.name}|${input.themeLabel}`,
    `VAL per=${input.per.toFixed(1)} sectorPer=${input.sectorAvgPer.toFixed(1)} pbr=${input.pbr.toFixed(2)} roe=${input.roe.toFixed(1)} discount=${input.discountPercent}%`,
    compressedFinance,
    `DISC\n${compressedDisclosures}`,
  ].join("\n");
}

function parseSignal(value: unknown): "positive" | "negative" | "neutral" | null {
  if (value === "positive" || value === "negative" || value === "neutral") {
    return value;
  }
  return null;
}

function parseRisk(value: unknown): ValueTrapRisk | null {
  if (typeof value === "string" && VALID_RISKS.has(value as ValueTrapRisk)) {
    return value as ValueTrapRisk;
  }
  return null;
}

export function parseUndervaluedDeepAnalysis(
  raw: unknown,
  base: {
    ticker: string;
    name: string;
    source: "llm" | "rule";
    provider?: LlmProvider | null;
    generatedAt: string;
  },
): UndervaluedDeepAnalysis | null {
  if (!raw || typeof raw !== "object") return null;

  const payload = raw as Record<string, unknown>;
  const valueTrapRisk = parseRisk(payload.valueTrapRisk);
  const reason = payload.reason;
  const catalyst = payload.catalyst;
  const expectedTimeline = payload.expectedTimeline;

  if (
    !valueTrapRisk ||
    typeof reason !== "string" ||
    typeof catalyst !== "string" ||
    typeof expectedTimeline !== "string"
  ) {
    return null;
  }

  const highlightsRaw = payload.financialHighlights;
  const disclosuresRaw = payload.disclosureNotes;
  const watchpointsRaw = payload.keyWatchpoints;

  if (!Array.isArray(highlightsRaw) || !Array.isArray(disclosuresRaw)) {
    return null;
  }

  const financialHighlights = highlightsRaw
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const item = entry as Record<string, unknown>;
      const signal = parseSignal(item.signal);
      if (
        typeof item.label !== "string" ||
        typeof item.detail !== "string" ||
        !signal
      ) {
        return null;
      }
      return { label: item.label, detail: item.detail, signal };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .slice(0, 5);

  const disclosureNotes = disclosuresRaw
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const item = entry as Record<string, unknown>;
      if (
        typeof item.date !== "string" ||
        typeof item.title !== "string" ||
        typeof item.impact !== "string" ||
        typeof item.category !== "string"
      ) {
        return null;
      }
      return {
        date: item.date,
        title: item.title,
        impact: item.impact,
        category: item.category,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .slice(0, 5);

  const keyWatchpoints = Array.isArray(watchpointsRaw)
    ? watchpointsRaw
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 3)
    : [];

  if (financialHighlights.length < 2 || keyWatchpoints.length < 2) return null;

  return {
    ticker: base.ticker,
    name: base.name,
    source: base.source,
    provider: base.provider ?? null,
    valueTrapRisk,
    reason: reason.trim(),
    catalyst: catalyst.trim(),
    expectedTimeline: expectedTimeline.trim(),
    financialHighlights,
    disclosureNotes,
    keyWatchpoints,
    generatedAt: base.generatedAt,
  };
}

function inferValueTrapRisk(
  context: ReturnType<typeof buildUndervaluedFinanceContext>,
): ValueTrapRisk {
  const hasDilution = context.disclosureNotes.some(
    (note) => note.category === "dilution" || note.category === "risk",
  );
  const hasNegativeFinance =
    context.negativeSignals >= 2 ||
    context.financialHighlights.some(
      (item) =>
        item.label === "영업이익" && item.signal === "negative",
    );

  if (hasDilution || (hasNegativeFinance && context.input.discountPercent < 20)) {
    return "high";
  }
  if (hasNegativeFinance || context.positiveSignals === 0) {
    return "medium";
  }
  return "low";
}

function buildRuleBasedAnalysis(
  context: ReturnType<typeof buildUndervaluedFinanceContext>,
): UndervaluedDeepAnalysis {
  const { input, financialHighlights, disclosureNotes } = context;
  const valueTrapRisk = inferValueTrapRisk(context);

  const topPositive = financialHighlights.find((item) => item.signal === "positive");
  const topNegative = financialHighlights.find((item) => item.signal === "negative");

  const reasonParts = [
    `업종 평균 PER ${input.sectorAvgPer.toFixed(1)}배 대비 ${input.per.toFixed(1)}배로 약 ${input.discountPercent}% 할인된 밸류에이션입니다.`,
    topPositive
      ? `${topPositive.label} 추이: ${topPositive.detail}`
      : topNegative
        ? `${topNegative.label} 둔화가 할인 요인으로 작용: ${topNegative.detail}`
        : `ROE ${input.roe.toFixed(1)}%, PBR ${input.pbr.toFixed(2)} 수준의 수익성·자산밸류를 확인했습니다.`,
  ];

  const earningsNote = disclosureNotes.find(
    (note) => note.category === "earnings" || note.category === "filing",
  );
  const returnNote = disclosureNotes.find(
    (note) => note.category === "dividend" || note.category === "buyback",
  );

  const catalyst = returnNote
    ? `${returnNote.title} — ${returnNote.impact} 이벤트가 재평가 촉매가 될 수 있습니다.`
    : earningsNote
      ? `${earningsNote.title} 등 실적 공시 흐름이 핵심 변수입니다.`
      : "다음 분기 실적에서 영업이익·마진 개선이 확인되면 섹터 대비 할인 폭 축소가 기대됩니다.";

  const expectedTimeline = earningsNote
    ? `${earningsNote.date} 전후 실적·공시 시즌`
    : "다음 분기 실적 발표 시즌 (약 1~2개월)";

  const keyWatchpoints = [
    financialHighlights[0]
      ? `${financialHighlights[0].label} 추이 모니터링`
      : "분기 매출·영업이익 추이",
    disclosureNotes[0]?.category === "dilution"
      ? "희석·자금조달 공시 후 주가 반응"
      : "업종 PER 리레이팅 여부",
    valueTrapRisk !== "low" ? "이익 둔화·부채 악화 재확인" : "실적 서프라이즈 시점",
  ];

  return {
    ticker: input.ticker,
    name: input.name,
    source: "rule",
    provider: null,
    valueTrapRisk,
    reason: reasonParts.join(" "),
    catalyst,
    expectedTimeline,
    financialHighlights: financialHighlights.slice(0, 5),
    disclosureNotes,
    keyWatchpoints,
    generatedAt: new Date().toISOString(),
  };
}

export interface GenerateUndervaluedAnalysisResult {
  analysis: UndervaluedDeepAnalysis;
  cached: boolean;
  llmAvailable: boolean;
}

export async function generateUndervaluedDeepAnalysis(
  input: UndervaluedAnalysisInput,
  options?: { skipCache?: boolean },
): Promise<GenerateUndervaluedAnalysisResult> {
  const cacheKey = buildCacheKey(input);
  const generatedAt = new Date().toISOString();

  if (!options?.skipCache) {
    const cached = await getLlmCacheAsync<UndervaluedDeepAnalysis>(cacheKey);
    if (cached) {
      return { analysis: { ...cached, cached: true }, cached: true, llmAvailable: hasLlmCredentials() };
    }
  }

  const [quarter, annual, disclosures] = await Promise.all([
    fetchNaverKrFinanceQuarter(input.ticker),
    fetchNaverKrFinanceAnnual(input.ticker),
    fetchNaverKrDisclosures(input.ticker, 40),
  ]);

  const context = buildUndervaluedFinanceContext(
    input,
    quarter,
    annual,
    disclosures,
  );

  const provider = resolveLlmProvider();
  if (provider) {
    const llmResult = await callLlmJson(
      SYSTEM_PROMPT,
      buildUserPrompt(context),
      (raw) =>
        parseUndervaluedDeepAnalysis(raw, {
          ticker: input.ticker,
          name: input.name,
          source: "llm",
          provider,
          generatedAt,
        }),
    );

    if (llmResult.data) {
      const analysis: UndervaluedDeepAnalysis = {
        ...llmResult.data,
        financialHighlights:
          llmResult.data.financialHighlights.length > 0
            ? llmResult.data.financialHighlights
            : context.financialHighlights,
        disclosureNotes:
          llmResult.data.disclosureNotes.length > 0
            ? llmResult.data.disclosureNotes
            : context.disclosureNotes,
      };

      await setLlmCacheAsync(cacheKey, analysis);
      return { analysis, cached: false, llmAvailable: true };
    }
  }

  const analysis = buildRuleBasedAnalysis(context);
  await setLlmCacheAsync(cacheKey, analysis);

  return {
    analysis,
    cached: false,
    llmAvailable: hasLlmCredentials(),
  };
}
