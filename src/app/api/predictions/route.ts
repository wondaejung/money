import { NextResponse } from "next/server";

import { mergeScanSymbols } from "@/data/after-hours-watchlist";
import {
  buildRuleBasedSnapshot,
  buildSessionKey,
  rankAfterHoursCandidates,
} from "@/lib/closing-bell-naver";
import { generateClosingBellSnapshot } from "@/lib/llm-closing-bell";
import {
  getAfterHoursCloseIso,
  getNextTradingDate,
  getPredictionSessionDate,
} from "@/lib/kr-market-time";
import { fetchNaverAfterHoursQuotes } from "@/lib/naver-finance";
import type { PredictionsApiResponse } from "@/types/prediction";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const portfolioSymbols = (searchParams.get("symbols") ?? "")
    .split(",")
    .map((symbol) => symbol.trim())
    .filter(Boolean);

  const sessionDate = getPredictionSessionDate();
  const targetTradingDate = getNextTradingDate(
    new Date(getAfterHoursCloseIso(sessionDate)),
  );
  const closedAtIso = getAfterHoursCloseIso(sessionDate);
  const scanSymbols = mergeScanSymbols(portfolioSymbols);
  const sessionKey = buildSessionKey(sessionDate, scanSymbols);

  const quotes = await fetchNaverAfterHoursQuotes(scanSymbols);
  const candidates = rankAfterHoursCandidates(quotes);

  if (candidates.length === 0) {
    return NextResponse.json(
      { error: "네이버 시간외 시세를 가져오지 못했습니다." },
      { status: 502 },
    );
  }

  const ruleSnapshot = buildRuleBasedSnapshot(
    sessionDate,
    targetTradingDate,
    closedAtIso,
    candidates,
  );

  const llmResult = await generateClosingBellSnapshot(
    sessionDate,
    targetTradingDate,
    closedAtIso,
    candidates,
    ruleSnapshot,
    sessionKey,
  );

  const response: PredictionsApiResponse = {
    snapshot: llmResult.snapshot,
    predictionSource: llmResult.predictionSource,
    llmProvider: llmResult.llmProvider,
    llmError: llmResult.llmError,
    fetchedAt: new Date().toISOString(),
  };

  return NextResponse.json(response);
}
