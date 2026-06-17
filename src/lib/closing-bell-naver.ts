import type { NaverAfterHoursQuote } from "@/lib/naver-finance";
import type { TodayAfterHoursSnapshot } from "@/types/prediction";

const CACHE_TTL_MS = 30 * 60 * 1000;
const RATE_LIMIT_CACHE_TTL_MS = 2 * 60 * 60 * 1000;

interface ClosingBellCacheEntry {
  sessionKey: string;
  snapshot: TodayAfterHoursSnapshot;
  predictionSource: "llm" | "rule";
  llmProvider: string | null;
  expiresAt: number;
}

let cache: ClosingBellCacheEntry | null = null;

export function getCachedClosingBellSnapshot(
  sessionKey: string,
): ClosingBellCacheEntry | null {
  if (!cache || cache.sessionKey !== sessionKey) return null;
  if (Date.now() > cache.expiresAt) {
    cache = null;
    return null;
  }
  return cache;
}

export function setCachedClosingBellSnapshot(
  entry: Omit<ClosingBellCacheEntry, "expiresAt"> & { rateLimited?: boolean },
): void {
  const ttl = entry.rateLimited ? RATE_LIMIT_CACHE_TTL_MS : CACHE_TTL_MS;
  const { rateLimited: _rateLimited, ...rest } = entry;
  cache = {
    ...rest,
    expiresAt: Date.now() + ttl,
  };
}

export function buildSessionKey(sessionDate: string, symbols: string[]): string {
  return `${sessionDate}:${symbols.sort().join(",")}`;
}

export interface AfterHoursCandidate extends NaverAfterHoursQuote {
  score: number;
}

export function rankAfterHoursCandidates(
  quotes: NaverAfterHoursQuote[],
): AfterHoursCandidate[] {
  return quotes
    .map((quote) => {
      const afterHoursBoost = quote.hasAfterHoursTrade
        ? Math.abs(quote.afterHoursChangePercent) * 2
        : Math.abs(quote.afterHoursChangePercent) * 0.5;
      const regularBoost = Math.max(quote.regularChangePercent, 0) * 0.3;

      return {
        ...quote,
        score: afterHoursBoost + regularBoost,
      };
    })
    .sort((a, b) => b.score - a.score);
}

export function buildRuleBasedSnapshot(
  sessionDate: string,
  targetTradingDate: string,
  closedAtIso: string,
  candidates: AfterHoursCandidate[],
): TodayAfterHoursSnapshot {
  const top = candidates.slice(0, 3);
  const leaders = candidates
    .filter((c) => c.hasAfterHoursTrade && c.afterHoursChangePercent > 0)
    .slice(0, 3);

  const summaryNames = leaders.length > 0 ? leaders : top;
  const sectorHint = summaryNames.map((c) => c.name).join(", ");

  return {
    krAfterHoursClosedAt: closedAtIso,
    targetTradingDate,
    marketSummary: `오후 6시 단일가 마감 — ${sectorHint} 등 시간외 강세 → 내일 09:00 개장 모멘텀 주목`,
    picks: top.map((quote) => ({
      symbol: quote.symbol,
      name: quote.name,
      sector: "국내주식",
      regularClosePrice: quote.regularClosePrice,
      afterHoursClosePrice: quote.afterHoursClosePrice,
      afterHoursChangePercent: quote.afterHoursChangePercent,
      riseProbability: Math.min(
        85,
        Math.round(50 + quote.afterHoursChangePercent * 4 + quote.score),
      ),
      reason: quote.hasAfterHoursTrade
        ? `시간외 ${quote.afterHoursChangePercent >= 0 ? "+" : ""}${quote.afterHoursChangePercent.toFixed(1)}% 마감 — 익일 갭상승 시나리오`
        : `정규장 ${quote.regularChangePercent >= 0 ? "+" : ""}${quote.regularChangePercent.toFixed(1)}% — 시간외 변동 제한적`,
    })),
  };
}
