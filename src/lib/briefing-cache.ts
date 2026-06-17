import type { LlmBriefingContent } from "@/lib/llm-briefing";

const CACHE_TTL_MS = 30 * 60 * 1000;

interface BriefingCacheEntry {
  content: LlmBriefingContent;
  expiresAt: number;
}

let briefingCache: BriefingCacheEntry | null = null;

export function getCachedLlmBriefing(): LlmBriefingContent | null {
  if (!briefingCache) return null;
  if (Date.now() > briefingCache.expiresAt) {
    briefingCache = null;
    return null;
  }
  return briefingCache.content;
}

export function setCachedLlmBriefing(content: LlmBriefingContent): void {
  briefingCache = {
    content,
    expiresAt: Date.now() + CACHE_TTL_MS,
  };
}

export function clearLlmBriefingCache(): void {
  briefingCache = null;
}
