import type { NaverIndexQuote, NaverScannerQuote } from "@/lib/naver-finance";
import type {
  AfterHoursFeatureBadge,
  AfterHoursFeaturedStock,
  MarketSentiment,
  MarketSentimentLevel,
} from "@/types/market-tone";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizePercent(changePercent: number): number {
  return clamp(((changePercent + 2) / 4) * 100, 0, 100);
}

function normalizeTradingValue(
  value: number,
  maxValue: number,
): number {
  if (maxValue <= 0) return 0;
  return clamp((value / maxValue) * 100, 0, 100);
}

function assignBadges(
  quote: NaverScannerQuote,
  changeRank: number,
  volumeRank: number,
): AfterHoursFeatureBadge[] {
  const badges: AfterHoursFeatureBadge[] = [];

  if (changeRank === 1) badges.push("change_leader");
  if (volumeRank === 1) badges.push("volume_leader");
  if (badges.length === 0) badges.push("momentum");

  return badges;
}

export function pickFeaturedAfterHoursStocks(
  quotes: NaverScannerQuote[],
): AfterHoursFeaturedStock[] {
  if (quotes.length === 0) return [];

  const activeQuotes = quotes.filter((quote) => quote.hasAfterHoursTrade);
  const pool = activeQuotes.length > 0 ? activeQuotes : quotes;

  const byChange = [...pool].sort(
    (a, b) =>
      Math.abs(b.afterHoursChangePercent) - Math.abs(a.afterHoursChangePercent),
  );
  const byVolume = [...pool].sort(
    (a, b) => b.tradingValueKrw - a.tradingValueKrw,
  );
  const maxVolume = byVolume[0]?.tradingValueKrw ?? 0;

  const composite = [...pool]
    .map((quote) => {
      const changeScore = Math.abs(quote.afterHoursChangePercent) * 10;
      const volumeScore = normalizeTradingValue(quote.tradingValueKrw, maxVolume) * 0.4;
      const directionBonus =
        quote.afterHoursChangePercent > 0
          ? quote.afterHoursChangePercent * 2
          : 0;

      return {
        quote,
        score: changeScore + volumeScore + directionBonus,
      };
    })
    .sort((a, b) => b.score - a.score);

  const picked: NaverScannerQuote[] = [];
  const pushUnique = (quote: NaverScannerQuote | undefined) => {
    if (!quote) return;
    if (picked.some((item) => item.symbol === quote.symbol)) return;
    picked.push(quote);
  };

  pushUnique(byChange[0]);
  pushUnique(byVolume[0]);

  for (const item of composite) {
    if (picked.length >= 3) break;
    pushUnique(item.quote);
  }

  const changeRankMap = new Map(
    byChange.map((quote, index) => [quote.symbol, index + 1]),
  );
  const volumeRankMap = new Map(
    byVolume.map((quote, index) => [quote.symbol, index + 1]),
  );

  return picked.slice(0, 3).map((quote, index) => ({
    symbol: quote.symbol,
    name: quote.name,
    afterHoursClosePrice: quote.afterHoursClosePrice,
    afterHoursChangePercent: quote.afterHoursChangePercent,
    tradingValueKrw: quote.tradingValueKrw,
    tradingValueLabel: quote.tradingValueLabel,
    badges: assignBadges(
      quote,
      changeRankMap.get(quote.symbol) ?? 99,
      volumeRankMap.get(quote.symbol) ?? 99,
    ),
    rank: index + 1,
  }));
}

function sentimentFromScore(score: number): MarketSentimentLevel {
  if (score >= 67) return "greed";
  if (score <= 33) return "fear";
  return "neutral";
}

const SENTIMENT_LABEL: Record<MarketSentimentLevel, string> = {
  greed: "탐욕",
  neutral: "중립",
  fear: "공포",
};

export function computeMarketSentiment(
  quotes: NaverScannerQuote[],
  kospi: NaverIndexQuote | null,
  kosdaq: NaverIndexQuote | null,
): MarketSentiment {
  const activeQuotes = quotes.filter((quote) => quote.hasAfterHoursTrade);
  const advancing =
    activeQuotes.length > 0
      ? activeQuotes.filter((quote) => quote.afterHoursChangePercent > 0).length
      : quotes.filter((quote) => quote.regularChangePercent > 0).length;
  const denominator = activeQuotes.length > 0 ? activeQuotes.length : quotes.length;
  const advancingRatio =
    denominator > 0 ? Math.round((advancing / denominator) * 100) : 50;

  const kospiChange = kospi?.changePercent ?? 0;
  const kosdaqChange = kosdaq?.changePercent ?? 0;
  const avgAfterHoursChange =
    activeQuotes.length > 0
      ? activeQuotes.reduce((sum, quote) => sum + quote.afterHoursChangePercent, 0) /
        activeQuotes.length
      : quotes.reduce((sum, quote) => sum + quote.regularChangePercent, 0) /
        Math.max(quotes.length, 1);

  const score = Math.round(
    normalizePercent(kospiChange) * 0.3 +
      normalizePercent(kosdaqChange) * 0.2 +
      advancingRatio * 0.35 +
      normalizePercent(avgAfterHoursChange) * 0.15,
  );

  const level = sentimentFromScore(score);
  const kospiLabel = `${kospiChange >= 0 ? "+" : ""}${kospiChange.toFixed(2)}%`;
  const kosdaqLabel = `${kosdaqChange >= 0 ? "+" : ""}${kosdaqChange.toFixed(2)}%`;

  const summary =
    level === "greed"
      ? `코스피 ${kospiLabel} · 시간외 상승 비중 ${advancingRatio}% — 익일 갭상승 베팅에 유리한 분위기`
      : level === "fear"
        ? `코스피 ${kospiLabel} · 시간외 약세 우세 — 보수적 접근 권장`
        : `코스피 ${kospiLabel} · 코스닥 ${kosdaqLabel} — 뚜렷한 방향성 없는 중립장`;

  return {
    level,
    score,
    label: SENTIMENT_LABEL[level],
    summary,
    kospiChangePercent: kospiChange,
    kosdaqChangePercent: kosdaqChange,
    advancingRatio,
  };
}

export function formatTradingValueShort(krw: number): string {
  if (krw >= 1_0000_0000_0000) {
    return `${(krw / 1_0000_0000_0000).toFixed(1)}조`;
  }
  if (krw >= 100_000_000) {
    return `${Math.round(krw / 100_000_000).toLocaleString()}억`;
  }
  if (krw >= 1_000_000) {
    return `${Math.round(krw / 1_000_000).toLocaleString()}백만`;
  }
  return `${krw.toLocaleString()}원`;
}
