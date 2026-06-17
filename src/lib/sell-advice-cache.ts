import type { LlmSellAdviceContent } from "@/lib/llm-sell-advice";

const CACHE_TTL_MS = 20 * 60 * 1000;

interface SellAdviceCacheEntry {
  content: LlmSellAdviceContent;
  expiresAt: number;
}

let sellAdviceCache: SellAdviceCacheEntry | null = null;

export function getCachedSellAdvice(): LlmSellAdviceContent | null {
  if (!sellAdviceCache) return null;
  if (Date.now() > sellAdviceCache.expiresAt) {
    sellAdviceCache = null;
    return null;
  }
  return sellAdviceCache.content;
}

export function setCachedSellAdvice(content: LlmSellAdviceContent): void {
  sellAdviceCache = {
    content,
    expiresAt: Date.now() + CACHE_TTL_MS,
  };
}

export function buildSellAdviceCacheKey(
  items: Array<{
    holdingId: string;
    action: string;
    currentPrice: number;
    changePercent: number;
  }>,
): string {
  return items
    .map(
      (item) =>
        `${item.holdingId}:${item.action}:${Math.round(item.currentPrice)}:${item.changePercent.toFixed(1)}`,
    )
    .sort()
    .join("|");
}

export function isCachedSellAdviceValid(cacheKey: string): boolean {
  const cached = getCachedSellAdvice();
  return cached?.cacheKey === cacheKey;
}
