import { NextResponse } from "next/server";

import { convertToKrw, fetchUsdKrwRate } from "@/lib/exchange-rate";
import { enrichSellRecommendationsWithLlm } from "@/lib/llm-sell-advice";
import { getSellCandidates } from "@/lib/sell-recommendation";
import { calculateTaxBreakdown } from "@/lib/tax";
import { fetchStockQuotes } from "@/lib/stock-quote";
import { fetchSparklines } from "@/lib/yahoo-finance";
import type { LiveHolding, UserPosition } from "@/types/portfolio";

function buildLiveHoldings(
  positions: UserPosition[],
  quotes: Awaited<ReturnType<typeof fetchStockQuotes>>,
  sparklines: Awaited<ReturnType<typeof fetchSparklines>>,
  usdToKrw: number,
): LiveHolding[] {
  return positions
    .map((position) => {
      const quote = quotes.get(position.yahooSymbol);
      if (!quote) return null;

      const totalCost = position.purchasePrice * position.shares;
      const totalValue = quote.price * position.shares;
      const gainAmount = totalValue - totalCost;
      const gainPercent =
        position.purchasePrice > 0
          ? ((quote.price - position.purchasePrice) / position.purchasePrice) *
            100
          : 0;

      const tax = calculateTaxBreakdown({
        market: position.market,
        gainAmount,
        totalCost,
        totalValue,
      });

      const valueKrw = convertToKrw(totalValue, position.currency, usdToKrw);
      const gainAmountKrw = convertToKrw(gainAmount, position.currency, usdToKrw);
      const estimatedTaxKrw = convertToKrw(
        tax.estimatedTax,
        position.currency,
        usdToKrw,
      );
      const totalCommissionKrw = convertToKrw(
        tax.totalCommission,
        position.currency,
        usdToKrw,
      );
      const gainAfterTaxKrw = convertToKrw(
        tax.gainAfterTax,
        position.currency,
        usdToKrw,
      );

      return {
        id: position.id,
        symbol: position.symbol,
        name: position.name || quote.name,
        market: position.market,
        shares: position.shares,
        purchasePrice: position.purchasePrice,
        currentPrice: quote.price,
        currency: position.currency,
        changePercent: quote.changePercent,
        gainAmount,
        gainPercent,
        totalValue,
        totalCost,
        sparkline: sparklines.get(position.yahooSymbol) ?? [],
        transactionTax: tax.transactionTax,
        capitalGainsTax: tax.capitalGainsTax,
        estimatedTax: tax.estimatedTax,
        buyCommission: tax.buyCommission,
        sellCommission: tax.sellCommission,
        totalCommission: tax.totalCommission,
        gainAfterTax: tax.gainAfterTax,
        gainPercentAfterTax: tax.gainPercentAfterTax,
        taxLabel: tax.taxLabel,
        taxDetails: tax.taxDetails,
        commissionLabel: tax.commissionLabel,
        commissionDetails: tax.commissionDetails,
        valueKrw,
        gainAmountKrw,
        estimatedTaxKrw,
        totalCommissionKrw,
        gainAfterTaxKrw,
      } satisfies LiveHolding;
    })
    .filter((holding): holding is LiveHolding => holding !== null);
}

export async function POST(request: Request) {
  const body = (await request.json()) as { positions?: UserPosition[] };
  const positions = body.positions ?? [];
  const fx = await fetchUsdKrwRate();

  if (positions.length === 0) {
    return NextResponse.json({
      holdings: [],
      sellRecommendations: [],
      usdToKrw: fx.usdToKrw,
      fxSource: fx.source,
      fxValid: fx.isValid,
      fetchedAt: new Date().toISOString(),
      source: "yahoo",
    });
  }

  const quoteItems = positions.map((position) => ({
    yahooSymbol: position.yahooSymbol,
    market: position.market,
  }));
  const yahooSymbols = positions.map((position) => position.yahooSymbol);

  const [quotes, sparklines] = await Promise.all([
    fetchStockQuotes(quoteItems),
    fetchSparklines(yahooSymbols),
  ]);

  const holdings = buildLiveHoldings(
    positions,
    quotes,
    sparklines,
    fx.usdToKrw,
  );
  const candidates = getSellCandidates(holdings);
  const sellAdvice = await enrichSellRecommendationsWithLlm(candidates);

  if (holdings.length === 0) {
    return NextResponse.json(
      {
        error: "주가 데이터를 가져오지 못했습니다.",
        failedSymbols: positions
          .filter((position) => !quotes.has(position.yahooSymbol))
          .map((position) => position.symbol),
      },
      { status: 502 },
    );
  }

  return NextResponse.json({
    holdings,
    sellRecommendations: sellAdvice.recommendations,
    sellAdviceSource: sellAdvice.adviceSource,
    sellAdviceLlmProvider: sellAdvice.llmProvider,
    sellAdviceLlmError: sellAdvice.llmError,
    usdToKrw: fx.usdToKrw,
    fxSource: fx.source,
    fxValid: fx.isValid,
    fetchedAt: new Date().toISOString(),
    source: "yahoo",
  });
}
