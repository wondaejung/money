import type { LlmBriefingContent } from "@/lib/llm-briefing";
import {
  clearLlmCacheAsync,
  getLlmCacheAsync,
  setLlmCacheAsync,
} from "@/lib/llm-cache";

const CACHE_KEY = "briefing:llm";

export async function getCachedLlmBriefing(): Promise<LlmBriefingContent | null> {
  return getLlmCacheAsync<LlmBriefingContent>(CACHE_KEY);
}

export async function setCachedLlmBriefing(
  content: LlmBriefingContent,
): Promise<void> {
  await setLlmCacheAsync(CACHE_KEY, content);
}

export async function clearLlmBriefingCache(): Promise<void> {
  await clearLlmCacheAsync(CACHE_KEY);
}
