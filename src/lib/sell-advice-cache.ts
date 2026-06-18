import type { LlmSellAdviceContent } from "@/lib/llm-sell-advice";
import { clearLlmCache, getLlmCache, setLlmCache } from "@/lib/llm-cache";

function cacheKeyFor(cacheKey: string): string {
  return `sell-advice:${cacheKey}`;
}

export function getCachedSellAdviceByKey(
  cacheKey: string,
): LlmSellAdviceContent | null {
  return getLlmCache<LlmSellAdviceContent>(cacheKeyFor(cacheKey));
}

export function setCachedSellAdvice(content: LlmSellAdviceContent): void {
  setLlmCache(cacheKeyFor(content.cacheKey), content);
}

export function clearSellAdviceCache(): void {
  clearLlmCache();
}

export function buildSellAdviceCacheKey(
  items: Array<{
    holdingId: string;
    action: string;
  }>,
): string {
  return items
    .map((item) => `${item.holdingId}:${item.action}`)
    .sort()
    .join("|");
}

export function isCachedSellAdviceValid(cacheKey: string): boolean {
  return getCachedSellAdviceByKey(cacheKey) !== null;
}
