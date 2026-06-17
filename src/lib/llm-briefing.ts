import { requestGroqChatCompletion } from "@/lib/llm-groq";
import type {
  OvernightIssue,
  ThemeForecast,
  ThemeImpact,
  UsIndex,
} from "@/types/briefing";

export interface LlmMarketContext {
  usIndices: UsIndex[];
  usStocks: Array<{
    symbol: string;
    name: string;
    changePercent: number;
  }>;
  generatedAtKst: string;
}

export interface LlmBriefingContent {
  overnightIssues: OvernightIssue[];
  themeForecasts: ThemeForecast[];
}

const VALID_IMPACTS = new Set<ThemeImpact>([
  "positive",
  "negative",
  "neutral",
]);

const SYSTEM_PROMPT = `당신은 한국 개인투자자를 위한 모닝 브리핑 애널리스트입니다.
밤사이 미국 증시 마감 데이터를 바탕으로, 오늘 한국 증시 개장 전에 읽을 브리핑을 작성합니다.

반드시 아래 JSON 스키마만 반환하세요. 다른 텍스트는 포함하지 마세요.
{
  "overnightIssues": [
    { "id": "issue-1", "title": "string", "summary": "string" }
  ],
  "themeForecasts": [
    {
      "id": "theme-1",
      "usTrigger": "string",
      "krTheme": "string",
      "impact": "positive" | "negative" | "neutral",
      "relatedStocks": ["string"]
    }
  ]
}

규칙:
- overnightIssues는 정확히 3개
- themeForecasts는 정확히 3개
- 모든 문장은 한국어로 작성
- usTrigger는 미국 시장 이슈(지수·종목·매크로)를 구체적으로 언급
- krTheme는 한국 증시에서 주목할 테마/섹터를 명확히 연결
- relatedStocks는 한국 상장 종목명 2~4개
- 과장 없이 투자 참고용 톤 유지`;

function buildUserPrompt(context: LlmMarketContext): string {
  const indices = context.usIndices
    .map(
      (index) =>
        `${index.name}: ${index.value.toFixed(2)} (${index.changePercent >= 0 ? "+" : ""}${index.changePercent.toFixed(2)}%)`,
    )
    .join("\n");

  const stocks = context.usStocks
    .map(
      (stock) =>
        `${stock.name} (${stock.symbol}): ${stock.changePercent >= 0 ? "+" : ""}${stock.changePercent.toFixed(2)}%`,
    )
    .join("\n");

  return `기준 시각(KST): ${context.generatedAtKst}

[미국 3대 지수 마감]
${indices}

[주요 미국 종목 등락률]
${stocks}

위 데이터를 바탕으로 overnightIssues 3개와 themeForecasts 3개를 생성하세요.`;
}

function isThemeImpact(value: unknown): value is ThemeImpact {
  return typeof value === "string" && VALID_IMPACTS.has(value as ThemeImpact);
}

function parseIssue(value: unknown, index: number): OvernightIssue | null {
  if (!value || typeof value !== "object") return null;

  const issue = value as Record<string, unknown>;
  const title = issue.title;
  const summary = issue.summary;

  if (typeof title !== "string" || typeof summary !== "string") return null;

  return {
    id: typeof issue.id === "string" ? issue.id : `issue-${index + 1}`,
    title,
    summary,
  };
}

function parseForecast(value: unknown, index: number): ThemeForecast | null {
  if (!value || typeof value !== "object") return null;

  const forecast = value as Record<string, unknown>;
  const usTrigger = forecast.usTrigger;
  const krTheme = forecast.krTheme;
  const impact = forecast.impact;
  const relatedStocks = forecast.relatedStocks;

  if (
    typeof usTrigger !== "string" ||
    typeof krTheme !== "string" ||
    !isThemeImpact(impact) ||
    !Array.isArray(relatedStocks)
  ) {
    return null;
  }

  const stocks = relatedStocks.filter(
    (stock): stock is string => typeof stock === "string" && stock.length > 0,
  );

  if (stocks.length === 0) return null;

  return {
    id: typeof forecast.id === "string" ? forecast.id : `theme-${index + 1}`,
    usTrigger,
    krTheme,
    impact,
    relatedStocks: stocks,
  };
}

export function parseLlmBriefingContent(
  raw: unknown,
): LlmBriefingContent | null {
  if (!raw || typeof raw !== "object") return null;

  const payload = raw as Record<string, unknown>;
  const issuesRaw = payload.overnightIssues;
  const forecastsRaw = payload.themeForecasts;

  if (!Array.isArray(issuesRaw) || !Array.isArray(forecastsRaw)) return null;

  const overnightIssues = issuesRaw
    .map((issue, index) => parseIssue(issue, index))
    .filter((issue): issue is OvernightIssue => issue !== null);

  const themeForecasts = forecastsRaw
    .map((forecast, index) => parseForecast(forecast, index))
    .filter((forecast): forecast is ThemeForecast => forecast !== null);

  if (overnightIssues.length < 3 || themeForecasts.length < 3) return null;

  return {
    overnightIssues: overnightIssues.slice(0, 3),
    themeForecasts: themeForecasts.slice(0, 3),
  };
}

async function callOpenAI(
  systemPrompt: string,
  userPrompt: string,
): Promise<LlmBriefingContent | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!response.ok) return null;

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = data.choices?.[0]?.message?.content;
  if (!content) return null;

  try {
    return parseLlmBriefingContent(JSON.parse(content));
  } catch {
    return null;
  }
}

async function requestOpenAIJson(
  systemPrompt: string,
  userPrompt: string,
): Promise<{ raw: unknown | null; error?: string }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { raw: null, error: "OPENAI_API_KEY가 없습니다." };

  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    return { raw: null, error: await readApiError(response) };
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = data.choices?.[0]?.message?.content;
  if (!content) return { raw: null, error: "OpenAI 응답이 비어 있습니다." };

  try {
    return { raw: JSON.parse(content) };
  } catch {
    return { raw: null, error: "OpenAI 응답을 파싱하지 못했습니다." };
  }
}

async function callAnthropic(
  systemPrompt: string,
  userPrompt: string,
): Promise<LlmBriefingContent | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const model = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-20250514";

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 2048,
      temperature: 0.4,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!response.ok) return null;

  const data = (await response.json()) as {
    content?: Array<{ type?: string; text?: string }>;
  };

  const text = data.content?.find((block) => block.type === "text")?.text;
  if (!text) return null;

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  try {
    return parseLlmBriefingContent(JSON.parse(jsonMatch[0]));
  } catch {
    return null;
  }
}

export interface LlmBriefingResult {
  content: LlmBriefingContent | null;
  provider: LlmProvider | null;
  error?: string;
}

async function readApiError(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as {
      error?: { message?: string };
    };
    return data.error?.message ?? `HTTP ${response.status}`;
  } catch {
    return `HTTP ${response.status}`;
  }
}

type ProviderCallResult =
  | { content: LlmBriefingContent; error?: undefined }
  | { content: null; error: string };

async function callGroq(
  systemPrompt: string,
  userPrompt: string,
): Promise<ProviderCallResult> {
  const { content, error } = await requestGroqChatCompletion(
    systemPrompt,
    userPrompt,
  );

  if (!content) {
    return { content: null, error: error ?? "Groq API 호출에 실패했습니다." };
  }

  try {
    const parsed = parseLlmBriefingContent(JSON.parse(content));
    if (!parsed) {
      return { content: null, error: "Groq 응답 JSON 형식이 올바르지 않습니다." };
    }
    return { content: parsed };
  } catch {
    return { content: null, error: "Groq 응답을 파싱하지 못했습니다." };
  }
}

async function requestGroqJson(
  systemPrompt: string,
  userPrompt: string,
): Promise<{ raw: unknown | null; error?: string }> {
  const { content, error } = await requestGroqChatCompletion(
    systemPrompt,
    userPrompt,
  );

  if (!content) {
    return { raw: null, error };
  }

  try {
    return { raw: JSON.parse(content) };
  } catch {
    return { raw: null, error: "Groq 응답을 파싱하지 못했습니다." };
  }
}

async function callGemini(
  systemPrompt: string,
  userPrompt: string,
): Promise<LlmBriefingContent | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const model = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ parts: [{ text: userPrompt }] }],
      generationConfig: {
        temperature: 0.4,
        responseMimeType: "application/json",
      },
    }),
  });

  if (!response.ok) return null;

  const data = (await response.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
  };

  const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!content) return null;

  try {
    return parseLlmBriefingContent(JSON.parse(content));
  } catch {
    return null;
  }
}

async function callOllama(
  systemPrompt: string,
  userPrompt: string,
): Promise<LlmBriefingContent | null> {
  const baseUrl = process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434";
  const model = process.env.OLLAMA_MODEL ?? "llama3.2";

  const response = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      stream: false,
      format: "json",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!response.ok) return null;

  const data = (await response.json()) as {
    message?: { content?: string };
  };

  const content = data.message?.content;
  if (!content) return null;

  try {
    return parseLlmBriefingContent(JSON.parse(content));
  } catch {
    return null;
  }
}

export type LlmProvider = "groq" | "gemini" | "ollama" | "openai" | "anthropic";

function hasCredentialsFor(provider: LlmProvider): boolean {
  switch (provider) {
    case "groq":
      return Boolean(process.env.GROQ_API_KEY);
    case "gemini":
      return Boolean(process.env.GEMINI_API_KEY);
    case "ollama":
      return (
        process.env.LLM_PROVIDER === "ollama" ||
        Boolean(process.env.OLLAMA_BASE_URL)
      );
    case "openai":
      return Boolean(process.env.OPENAI_API_KEY);
    case "anthropic":
      return Boolean(process.env.ANTHROPIC_API_KEY);
  }
}

export function resolveLlmProvider(): LlmProvider | null {
  const explicit = process.env.LLM_PROVIDER as LlmProvider | undefined;

  if (explicit && hasCredentialsFor(explicit)) {
    return explicit;
  }

  if (process.env.GROQ_API_KEY) return "groq";
  if (process.env.GEMINI_API_KEY) return "gemini";
  if (process.env.OPENAI_API_KEY) return "openai";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.OLLAMA_BASE_URL || process.env.LLM_PROVIDER === "ollama") {
    return "ollama";
  }

  return null;
}

export function hasLlmCredentials(): boolean {
  return resolveLlmProvider() !== null;
}

async function callProvider(
  provider: LlmProvider,
  systemPrompt: string,
  userPrompt: string,
): Promise<ProviderCallResult> {
  switch (provider) {
    case "groq":
      return callGroq(systemPrompt, userPrompt);
    case "gemini": {
      const content = await callGemini(systemPrompt, userPrompt);
      return content
        ? { content }
        : { content: null, error: "Gemini API 호출에 실패했습니다." };
    }
    case "ollama": {
      const content = await callOllama(systemPrompt, userPrompt);
      return content
        ? { content }
        : { content: null, error: "Ollama 연결에 실패했습니다." };
    }
    case "anthropic": {
      const content = await callAnthropic(systemPrompt, userPrompt);
      return content
        ? { content }
        : { content: null, error: "Anthropic API 호출에 실패했습니다." };
    }
    case "openai": {
      const content = await callOpenAI(systemPrompt, userPrompt);
      return content
        ? { content }
        : { content: null, error: "OpenAI API 호출에 실패했습니다." };
    }
  }
}

async function requestProviderJson(
  provider: LlmProvider,
  systemPrompt: string,
  userPrompt: string,
): Promise<{ raw: unknown | null; error?: string }> {
  switch (provider) {
    case "groq":
      return requestGroqJson(systemPrompt, userPrompt);
    case "openai":
      return requestOpenAIJson(systemPrompt, userPrompt);
    case "gemini": {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return { raw: null, error: "GEMINI_API_KEY가 없습니다." };
      }

      const model = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ parts: [{ text: userPrompt }] }],
          generationConfig: {
            temperature: 0.4,
            responseMimeType: "application/json",
          },
        }),
      });

      if (!response.ok) {
        return { raw: null, error: `Gemini HTTP ${response.status}` };
      }

      const data = (await response.json()) as {
        candidates?: Array<{
          content?: { parts?: Array<{ text?: string }> };
        }>;
      };

      const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!content) {
        return { raw: null, error: "Gemini 응답이 비어 있습니다." };
      }

      try {
        return { raw: JSON.parse(content) };
      } catch {
        return { raw: null, error: "Gemini 응답을 파싱하지 못했습니다." };
      }
    }
    case "ollama": {
      const baseUrl = process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434";
      const model = process.env.OLLAMA_MODEL ?? "llama3.2";

      const response = await fetch(`${baseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          stream: false,
          format: "json",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        }),
      });

      if (!response.ok) {
        return { raw: null, error: `Ollama HTTP ${response.status}` };
      }

      const data = (await response.json()) as {
        message?: { content?: string };
      };

      const content = data.message?.content;
      if (!content) {
        return { raw: null, error: "Ollama 응답이 비어 있습니다." };
      }

      try {
        return { raw: JSON.parse(content) };
      } catch {
        return { raw: null, error: "Ollama 응답을 파싱하지 못했습니다." };
      }
    }
    case "anthropic": {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        return { raw: null, error: "ANTHROPIC_API_KEY가 없습니다." };
      }

      const model = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-20250514";

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          max_tokens: 2048,
          temperature: 0.4,
          system: systemPrompt,
          messages: [{ role: "user", content: userPrompt }],
        }),
      });

      if (!response.ok) {
        return { raw: null, error: `Anthropic HTTP ${response.status}` };
      }

      const data = (await response.json()) as {
        content?: Array<{ type?: string; text?: string }>;
      };

      const text = data.content?.find((block) => block.type === "text")?.text;
      if (!text) {
        return { raw: null, error: "Anthropic 응답이 비어 있습니다." };
      }

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return { raw: null, error: "Anthropic JSON을 찾지 못했습니다." };
      }

      try {
        return { raw: JSON.parse(jsonMatch[0]) };
      } catch {
        return { raw: null, error: "Anthropic 응답을 파싱하지 못했습니다." };
      }
    }
  }
}

export async function callLlmJson<T>(
  systemPrompt: string,
  userPrompt: string,
  parse: (raw: unknown) => T | null,
): Promise<{ data: T | null; provider: LlmProvider | null; error?: string }> {
  const provider = resolveLlmProvider();
  if (!provider) {
    return {
      data: null,
      provider: null,
      error: "LLM API 키가 설정되지 않았습니다.",
    };
  }

  const result = await requestProviderJson(provider, systemPrompt, userPrompt);
  if (!result.raw) {
    return {
      data: null,
      provider,
      error: result.error ?? "LLM 호출에 실패했습니다.",
    };
  }

  const parsed = parse(result.raw);
  if (!parsed) {
    return {
      data: null,
      provider,
      error: "LLM 응답 JSON 형식이 올바르지 않습니다.",
    };
  }

  return { data: parsed, provider };
}

export { formatLlmErrorMessage } from "@/lib/llm-groq";

export async function generateLlmBriefing(
  context: LlmMarketContext,
): Promise<LlmBriefingResult> {
  const provider = resolveLlmProvider();
  if (!provider) {
    return { content: null, provider: null, error: "LLM API 키가 설정되지 않았습니다." };
  }

  const prompt = buildUserPrompt(context);
  const result = await callProvider(provider, SYSTEM_PROMPT, prompt);

  return {
    content: result.content,
    provider,
    error: result.error,
  };
}

