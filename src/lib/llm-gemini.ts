import { buildJsonSystemPrompt } from "@/lib/llm-prompt";
import {
  recordGeminiApiCall,
  waitForGeminiBudgetSlot,
} from "@/lib/llm-gemini-budget";

function formatGeminiApiError(status: number, message: string): string {
  if (status === 429 || /quota|rate limit/i.test(message)) {
    return "Gemini API 할당량 초과 — 잠시 후 다시 시도하거나 캐시된 결과를 사용합니다.";
  }

  return message.length > 120 ? `${message.slice(0, 120)}…` : message;
}

function getGeminiModelChain(): string[] {
  const primary = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash-lite";
  const fromEnv = process.env.GEMINI_FALLBACK_MODELS?.split(",")
    .map((model) => model.trim())
    .filter(Boolean);

  if (!fromEnv?.length) {
    return [primary];
  }

  return [...new Set([primary, ...fromEnv])];
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

const inflightRequests = new Map<
  string,
  Promise<{ text: string | null; error?: string }>
>();

function buildRequestFingerprint(
  systemPrompt: string,
  userPrompt: string,
): string {
  return `${systemPrompt.length}:${userPrompt}`;
}

async function callGeminiOnce(
  model: string,
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
): Promise<{ text: string | null; error?: string; status?: number }> {
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
    return {
      text: null,
      error: await readGeminiError(response),
      status: response.status,
    };
  }

  const data = (await response.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
  };

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (text) return { text };

  return { text: null, error: "Gemini 응답이 비어 있습니다." };
}

export async function requestGeminiJsonText(
  systemPrompt: string,
  userPrompt: string,
): Promise<{ text: string | null; error?: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { text: null, error: "GEMINI_API_KEY가 없습니다." };
  }

  const fingerprint = buildRequestFingerprint(systemPrompt, userPrompt);
  const inflight = inflightRequests.get(fingerprint);
  if (inflight) return inflight;

  const task = (async () => {
    const budget = await waitForGeminiBudgetSlot();
    if (!budget.allowed) {
      return { text: null, error: budget.error };
    }

    let lastError = "Gemini API 호출에 실패했습니다.";
    const models = getGeminiModelChain();

    for (let index = 0; index < models.length; index += 1) {
      const model = models[index];
      const result = await callGeminiOnce(model, apiKey, systemPrompt, userPrompt);

      if (result.text) {
        await recordGeminiApiCall();
        return { text: result.text };
      }

      lastError = result.error ?? lastError;

      const hasAnotherModel = index < models.length - 1;
      if (hasAnotherModel && (result.status === 429 || result.status === 404)) {
        continue;
      }

      return { text: null, error: lastError };
    }

    return { text: null, error: lastError };
  })();

  inflightRequests.set(fingerprint, task);

  try {
    return await task;
  } finally {
    inflightRequests.delete(fingerprint);
  }
}
