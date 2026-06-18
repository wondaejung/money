import { NextResponse } from "next/server";

import { mergeScanSymbols } from "@/data/after-hours-watchlist";
import { rankAfterHoursCandidates } from "@/lib/closing-bell-naver";
import {
  generateDailyReportContent,
  toDailyMarketReport,
} from "@/lib/llm-daily-report";
import {
  formatKstDate,
  getPredictionSessionDate,
  isAfterHoursSessionClosed,
} from "@/lib/kr-market-time";
import {
  fetchNaverAfterHoursQuotes,
  fetchNaverIndexQuote,
} from "@/lib/naver-finance";
import type { DailyReportApiResponse } from "@/types/daily-report";

function buildCacheKey(targetDate: string, symbols: string[]): string {
  return `daily-report:${targetDate}:${symbols.sort().join(",")}`;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const portfolioSymbols = (searchParams.get("symbols") ?? "")
    .split(",")
    .map((symbol) => symbol.trim())
    .filter(Boolean);
  const holdingsParam = searchParams.get("holdings") ?? "";
  const holdings = holdingsParam
    .split(";")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [symbol, name] = entry.split("|");
      if (!symbol || !name) return null;
      return { symbol, name };
    })
    .filter((entry): entry is { symbol: string; name: string } => entry !== null);

  const targetDate = getPredictionSessionDate();
  const pendingToday = !isAfterHoursSessionClosed() && formatKstDate() !== targetDate;

  const scanSymbols = mergeScanSymbols(portfolioSymbols);
  const cacheKey = buildCacheKey(targetDate, scanSymbols);

  const [quotes, kospi, kosdaq] = await Promise.all([
    fetchNaverAfterHoursQuotes(scanSymbols),
    fetchNaverIndexQuote("KOSPI"),
    fetchNaverIndexQuote("KOSDAQ"),
  ]);

  const candidates = rankAfterHoursCandidates(quotes);

  if (candidates.length === 0) {
    return NextResponse.json(
      { error: "국내 시장 데이터를 가져오지 못했습니다." },
      { status: 502 },
    );
  }

  const kospiChange = kospi?.changePercent ?? 0;
  const kosdaqChange = kosdaq?.changePercent ?? 0;

  const result = await generateDailyReportContent(
    cacheKey,
    targetDate,
    kospiChange,
    kosdaqChange,
    candidates,
    holdings,
  );

  const report = toDailyMarketReport(
    targetDate,
    "오후 6시 시간외 단일가 마감",
    result,
  );

  const response: DailyReportApiResponse = {
    report,
    pending: pendingToday,
    pendingMessage: pendingToday
      ? "오늘의 보고서는 시간외 단일가 마감 후 발행됩니다. 아래는 직전 거래일 리포트입니다."
      : undefined,
    fetchedAt: new Date().toISOString(),
  };

  return NextResponse.json(response);
}
