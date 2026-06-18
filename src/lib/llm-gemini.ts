import { buildJsonSystemPrompt } from "@/lib/llm-prompt";

function formatGeminiApiError(status: number, message: string): string {
  if (status === 429 || /quota|rate limit/i.test(message)) {
    return "Gemini API 할당량 초과 — 다른 모델로 재시도하거나 Google AI Studio에서 요금제를 확인해 주세요.";
  }

  return message.length > 120 ? `${message.slice(0, 120)}…` : message;
}

function getGeminiModelChain(): string[] {
  const primary = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash-lite";
  const fromEnv = process.env.GEMINI_FALLBACK_MODELS?.split(",")
    .map((model) => model.trim())
    .filter(Boolean);

  const fallbacks = fromEnv?.length
    ? fromEnv
    : ["gemini-2.5-flash-lite", "gemini-2.0-flash-lite"];

  return [...new Set([primary, ...fallbacks])];
}

async function readGeminiError(response: Response): Promise<string> {
  const body = (await response.json().catch(() => null)) as {
    error?: { message?: string };
  } | null;
  const message = body?.error?.message ?? `HTTP ${response.status}`;
  return formatGeminiApiError(response.status, message);
}

export function buildGeminiJsonSystemInstruction(
  role: string,
  schema: string,
  rules?: string[],
): string {
  return buildJsonSystemPrompt({ role, schema, rules });
}

export async function requestGeminiJsonText(
  systemPrompt: string,
  userPrompt: string,
): Promise<{ text: string | null; error?: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { text: null, error: "GEMINI_API_KEY가 없습니다." };
  }

  let lastError = "Gemini API 호출에 실패했습니다.";

  for (const model of getGeminiModelChain()) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: userPrompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 1200,
          responseMimeType: "application/json",
        },
      }),
    });

    if (!response.ok) {
      lastError = await readGeminiError(response);
      if (response.status === 429 || response.status === 404) continue;
      return { text: null, error: lastError };
    }

    const data = (await response.json()) as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
      }>;
    };

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (text) return { text };

    lastError = "Gemini 응답이 비어 있습니다.";
  }

  return { text: null, error: lastError };
}
