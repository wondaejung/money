import type { LlmSellAdviceContent } from "@/lib/llm-sell-advice";
import {
  getLlmCacheAsync,
  setLlmCacheAsync,
} from "@/lib/llm-cache";

function cacheKeyFor(cacheKey: string): string {
  return `sell-advice:${cacheKey}`;
}

export async function getCachedSellAdviceByKey(
  cacheKey: string,
): Promise<LlmSellAdviceContent | null> {
  return getLlmCacheAsync<LlmSellAdviceContent>(cacheKeyFor(cacheKey));
}

export async function setCachedSellAdvice(
  content: LlmSellAdviceContent,
): Promise<void> {
  await setLlmCacheAsync(cacheKeyFor(content.cacheKey), content);
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

export async function isCachedSellAdviceValid(
  cacheKey: string,
): Promise<boolean> {
  return (await getCachedSellAdviceByKey(cacheKey)) !== null;
}

function isSellAdviceLlmEnabled(): boolean {
  const flag = process.env.GEMINI_ENABLE_SELL_ADVICE?.trim().toLowerCase();
  return flag === "true" || flag === "1";
}

export function isSellAdviceLlmEnabledForProvider(
  provider: string | null | undefined,
): boolean {
  if (provider !== "gemini") return true;
  return isSellAdviceLlmEnabled();
}
