import type { LlmClosingBellContent } from "@/lib/llm-closing-bell";
import { getLlmCache, setLlmCache } from "@/lib/llm-cache";

function cacheKeyFor(sessionKey: string): string {
  return `closing-bell:${sessionKey}`;
}

export function getCachedClosingBellLlm(
  sessionKey: string,
): LlmClosingBellContent | null {
  return getLlmCache<LlmClosingBellContent>(cacheKeyFor(sessionKey));
}

export function setCachedClosingBellLlm(
  sessionKey: string,
  content: LlmClosingBellContent,
): void {
  setLlmCache(cacheKeyFor(sessionKey), content);
}
