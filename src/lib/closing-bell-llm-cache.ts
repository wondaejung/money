import type { LlmClosingBellContent } from "@/lib/llm-closing-bell";
import { getLlmCacheAsync, setLlmCacheAsync } from "@/lib/llm-cache";

function cacheKeyFor(sessionKey: string): string {
  return `closing-bell:${sessionKey}`;
}

export async function getCachedClosingBellLlm(
  sessionKey: string,
): Promise<LlmClosingBellContent | null> {
  return getLlmCacheAsync<LlmClosingBellContent>(cacheKeyFor(sessionKey));
}

export async function setCachedClosingBellLlm(
  sessionKey: string,
  content: LlmClosingBellContent,
): Promise<void> {
  await setLlmCacheAsync(cacheKeyFor(sessionKey), content);
}
