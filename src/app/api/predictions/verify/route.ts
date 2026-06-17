import { NextResponse } from "next/server";

import {
  evaluateVerification,
  getRegularMarketCloseIso,
} from "@/lib/kr-market-time";
import { fetchNaverDayOhlc } from "@/lib/naver-finance";
import type {
  PredictionVerification,
  VerifyPredictionsApiResponse,
} from "@/types/prediction";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    targetTradingDate?: string;
    verifications?: Array<{
      symbol: string;
      name: string;
      baselinePrice: number;
      baselineType: "regular_close" | "after_hours_close";
    }>;
  };

  const targetTradingDate = body.targetTradingDate;
  const items = body.verifications ?? [];

  if (!targetTradingDate || items.length === 0) {
    return NextResponse.json(
      { error: "targetTradingDate와 verifications가 필요합니다." },
      { status: 400 },
    );
  }

  const verifiedAt = getRegularMarketCloseIso(targetTradingDate);
  const results: PredictionVerification[] = [];

  for (const item of items) {
    const ohlc = await fetchNaverDayOhlc(item.symbol, targetTradingDate);

    if (!ohlc) {
      results.push({
        symbol: item.symbol,
        name: item.name,
        baselinePrice: item.baselinePrice,
        baselineType: item.baselineType,
        nextDayOpen: null,
        nextDayHigh: null,
        nextDayClose: null,
        maxGainPercent: null,
        outcome: "pending",
        verifiedAt: null,
      });
      continue;
    }

    const evaluation = evaluateVerification(
      item.baselinePrice,
      ohlc.open,
      ohlc.high,
    );

    results.push({
      symbol: item.symbol,
      name: item.name,
      baselinePrice: item.baselinePrice,
      baselineType: item.baselineType,
      nextDayOpen: ohlc.open,
      nextDayHigh: ohlc.high,
      nextDayClose: ohlc.close,
      maxGainPercent: evaluation.maxGainPercent,
      outcome: evaluation.outcome,
      verifiedAt,
    });
  }

  const response: VerifyPredictionsApiResponse = {
    targetTradingDate,
    verifications: results,
    nextDayMarketClosedAt: verifiedAt,
    fetchedAt: new Date().toISOString(),
  };

  return NextResponse.json(response);
}
