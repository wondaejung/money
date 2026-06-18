import { NextResponse } from "next/server";

import { mergeScanSymbols } from "@/data/after-hours-watchlist";
import { getPredictionSessionDate } from "@/lib/kr-market-time";
import {
  computeMarketSentiment,
  pickFeaturedAfterHoursStocks,
} from "@/lib/market-tone";
import {
  fetchIndexQuoteWithFallback,
  fetchScannerQuotesWithFallback,
} from "@/lib/naver-finance";
import type { MarketToneApiResponse } from "@/types/market-tone";

const CACHE_TTL_MS = 30 * 60 * 1000;

interface MarketToneCacheEntry {
  sessionKey: string;
  payload: MarketToneApiResponse;
  expiresAt: number;
}

let cache: MarketToneCacheEntry | null = null;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const portfolioSymbols = (searchParams.get("symbols") ?? "")
    .split(",")
    .map((symbol) => symbol.trim())
    .filter(Boolean);

  const sessionDate = getPredictionSessionDate();
  const scanSymbols = mergeScanSymbols(portfolioSymbols);
  const sessionKey = `${sessionDate}:${scanSymbols.sort().join(",")}`;

  if (cache && cache.sessionKey === sessionKey && Date.now() < cache.expiresAt) {
    return NextResponse.json(cache.payload);
  }

  const [quotes, kospi, kosdaq] = await Promise.all([
    fetchScannerQuotesWithFallback(scanSymbols),
    fetchIndexQuoteWithFallback("KOSPI"),
    fetchIndexQuoteWithFallback("KOSDAQ"),
  ]);

  if (quotes.length === 0) {
    return NextResponse.json(
      { error: "시장 센티멘트 데이터를 가져오지 못했습니다." },
      { status: 502 },
    );
  }

  const payload: MarketToneApiResponse = {
    sessionDate,
    closedAtLabel: "오후 6시 시간외 단일가 마감",
    featuredStocks: pickFeaturedAfterHoursStocks(quotes),
    sentiment: computeMarketSentiment(quotes, kospi, kosdaq),
    fetchedAt: new Date().toISOString(),
  };

  cache = {
    sessionKey,
    payload,
    expiresAt: Date.now() + CACHE_TTL_MS,
  };

  return NextResponse.json(payload);
}
