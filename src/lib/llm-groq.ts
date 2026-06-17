const DEFAULT_GROQ_MODEL = "llama-3.1-8b-instant";
const DEFAULT_GROQ_FALLBACKS = ["llama-3.1-8b-instant", "gemma2-9b-it"];

let rateLimitedUntil = 0;

export function getGroqModelChain(): string[] {
  const primary = process.env.GROQ_MODEL?.trim() || DEFAULT_GROQ_MODEL;
  const fromEnv = process.env.GROQ_FALLBACK_MODELS?.split(",")
    .map((model) => model.trim())
    .filter(Boolean);

  const fallbacks = fromEnv?.length ? fromEnv : DEFAULT_GROQ_FALLBACKS;
  return [...new Set([primary, ...fallbacks])];
}

export function isGroqRateLimited(): boolean {
  return Date.now() < rateLimitedUntil;
}

function parseRetryAfterMs(message: string): number | null {
  const match = message.match(/try again in (?:(\d+)m)?([\d.]+)s/i);
  if (!match) return null;

  const minutes = match[1] ? Number(match[1]) : 0;
  const seconds = match[2] ? Number(match[2]) : 0;
  return Math.ceil((minutes * 60 + seconds) * 1000);
}

export function markGroqRateLimited(message: string): void {
  const retryMs = parseRetryAfterMs(message) ?? 15 * 60 * 1000;
  rateLimitedUntil = Date.now() + retryMs;
}

export function isGroqRateLimitError(status: number, message: string): boolean {
  return (
    status === 429 ||
    /rate limit|tokens per day|\bTPD\b|일일 토큰 한도|토큰 한도 초과/i.test(message)
  );
}

export function formatLlmErrorMessage(error: string): string {
  if (isGroqRateLimitError(0, error)) {
    const retryMs = parseRetryAfterMs(error);
    if (retryMs) {
      const minutes = Math.ceil(retryMs / 60_000);
      return `Groq 일일 토큰 한도 초과 — 약 ${minutes}분 후 재시도 가능 (지금은 규칙 기반 표시)`;
    }
    return "Groq 일일 토큰 한도 초과 — 규칙 기반으로 표시합니다.";
  }

  if (error.length > 140) {
    return `${error.slice(0, 140)}…`;
  }

  return error;
}

interface GroqChatResult {
  content: string | null;
  model: string | null;
  error?: string;
}

export async function requestGroqChatCompletion(
  systemPrompt: string,
  userPrompt: string,
): Promise<GroqChatResult> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return { content: null, model: null, error: "GROQ_API_KEY가 없습니다." };
  }

  if (isGroqRateLimited()) {
    return {
      content: null,
      model: null,
      error: "Groq 일일 토큰 한도 초과 — 잠시 후 다시 시도해 주세요.",
    };
  }

  const models = getGroqModelChain();
  let lastError = "Groq API 호출에 실패했습니다.";

  for (const model of models) {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.3,
        max_tokens: 1024,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (response.ok) {
      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = data.choices?.[0]?.message?.content ?? null;
      if (!content) {
        lastError = "Groq 응답이 비어 있습니다.";
        continue;
      }
      return { content, model };
    }

    let errorMessage = `HTTP ${response.status}`;
    try {
      const data = (await response.json()) as {
        error?: { message?: string };
      };
      errorMessage = data.error?.message ?? errorMessage;
    } catch {
      // ignore parse error
    }

    lastError = errorMessage;

    if (isGroqRateLimitError(response.status, errorMessage)) {
      markGroqRateLimited(errorMessage);
      continue;
    }

    break;
  }

  return {
    content: null,
    model: null,
    error: formatLlmErrorMessage(lastError),
  };
}
