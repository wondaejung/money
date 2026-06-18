import type { LlmBriefingContent } from "@/lib/llm-briefing";
import { clearLlmCache, getLlmCache, setLlmCache } from "@/lib/llm-cache";

const CACHE_KEY = "briefing:llm";

export function getCachedLlmBriefing(): LlmBriefingContent | null {
  return getLlmCache<LlmBriefingContent>(CACHE_KEY);
}

export function setCachedLlmBriefing(content: LlmBriefingContent): void {
  setLlmCache(CACHE_KEY, content);
}

export function clearLlmBriefingCache(): void {
  clearLlmCache(CACHE_KEY);
}
