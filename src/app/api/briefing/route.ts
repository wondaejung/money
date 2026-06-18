import { NextResponse } from "next/server";

import { portfolioPositions } from "@/data/portfolio-config";
import { mockBriefing } from "@/data/mock-briefing";
import {
  clearLlmBriefingCache,
  getCachedLlmBriefing,
  setCachedLlmBriefing,
} from "@/lib/briefing-cache";
import { generateLlmBriefing, hasLlmCredentials, resolveLlmProvider } from "@/lib/llm-briefing";
import { fetchYahooQuote, fetchYahooQuotes } from "@/lib/yahoo-finance";
import type { UsIndex } from "@/types/briefing";

const US_INDEX_SYMBOLS: { symbol: string; name: string }[] = [
  { symbol: "^GSPC", name: "S&P 500" },
  { symbol: "^IXIC", name: "NASDAQ" },
  { symbol: "^DJI", name: "DOW" },
];

function getKstTimestamp(): string {
  return new Date().toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    dateStyle: "full",
    timeStyle: "short",
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const forceLlmRefresh = searchParams.get("refreshLlm") === "true";

  if (forceLlmRefresh) {
    await clearLlmBriefingCache();
  }

  const indexResults = await Promise.all(
    US_INDEX_SYMBOLS.map(async ({ symbol, name }) => {
      const quote = await fetchYahooQuote(symbol);
      if (!quote) return null;

      return {
        name,
        value: quote.price,
        changePercent: quote.changePercent,
      } satisfies UsIndex;
    }),
  );

  const usIndices = indexResults.filter(
    (index): index is UsIndex => index !== null,
  );

  const resolvedIndices =
    usIndices.length > 0 ? usIndices : mockBriefing.usIndices;

  const usPositions = portfolioPositions.filter(
    (position) => position.market === "US",
  );
  const usQuotes = await fetchYahooQuotes(
    usPositions.map((position) => position.yahooSymbol),
  );

  const usStocks = usPositions
    .map((position) => {
      const quote = usQuotes.get(position.yahooSymbol);
      if (!quote) return null;

      return {
        symbol: position.symbol,
        name: position.name,
        changePercent: quote.changePercent,
      };
    })
    .filter((stock): stock is NonNullable<typeof stock> => stock !== null);

  let overnightIssues = mockBriefing.overnightIssues;
  let themeForecasts = mockBriefing.themeForecasts;
  let briefingSource: "llm" | "mock" = "mock";
  let llmProvider = resolveLlmProvider();
  let llmError: string | undefined;

  if (hasLlmCredentials()) {
    const cached = await getCachedLlmBriefing();

    if (cached && !forceLlmRefresh) {
      overnightIssues = cached.overnightIssues;
      themeForecasts = cached.themeForecasts;
      briefingSource = "llm";
    } else {
      const llmResult = await generateLlmBriefing({
        usIndices: resolvedIndices,
        usStocks,
        generatedAtKst: getKstTimestamp(),
      });

      llmProvider = llmResult.provider;
      llmError = llmResult.error;

      if (llmResult.content) {
        await setCachedLlmBriefing(llmResult.content);
        overnightIssues = llmResult.content.overnightIssues;
        themeForecasts = llmResult.content.themeForecasts;
        briefingSource = "llm";
        llmError = undefined;
      }
    }
  }

  return NextResponse.json({
    usIndices: resolvedIndices,
    overnightIssues,
    themeForecasts,
    fetchedAt: new Date().toISOString(),
    briefingSource,
    llmProvider,
    llmError,
  });
}
