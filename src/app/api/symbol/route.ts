import { NextResponse } from "next/server";

import { fetchUsdKrwRate } from "@/lib/exchange-rate";
import {
  detectMarket,
  getCurrency,
  normalizeSymbolInput,
  toYahooSymbol,
} from "@/lib/symbol-utils";
import { fetchStockQuote, resolveKrYahooSymbol } from "@/lib/stock-quote";
import { searchStocks } from "@/lib/yahoo-search";
import type { Market } from "@/types/market";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol");
  const name = searchParams.get("name");
  const marketParam = searchParams.get("market") as Market | null;

  if (!symbol && !name) {
    return NextResponse.json(
      { error: "symbol 또는 name이 필요합니다." },
      { status: 400 },
    );
  }

  if (name && !symbol) {
    const results = await searchStocks(name, marketParam ?? undefined);
    if (results.length === 0) {
      return NextResponse.json(
        { error: "종목을 찾을 수 없습니다. 다른 이름으로 검색해 보세요." },
        { status: 404 },
      );
    }

    const best = results[0];
    const quote = await fetchStockQuote(best.yahooSymbol, best.market, {
      cache: "no-store",
    });

    if (!quote) {
      return NextResponse.json(
        { error: "종목 시세를 가져오지 못했습니다." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      symbol: best.symbol,
      name: best.name,
      market: best.market,
      currency: best.currency,
      yahooSymbol: best.yahooSymbol,
      currentPrice: quote.price,
      changePercent: quote.changePercent,
      searchResults: results.slice(0, 8),
    });
  }

  const market = marketParam ?? detectMarket(symbol!);
  const normalized = normalizeSymbolInput(symbol!, market);
  const yahooSymbol =
    market === "KR"
      ? await resolveKrYahooSymbol(normalized)
      : toYahooSymbol(normalized, market);
  const quote = await fetchStockQuote(yahooSymbol, market, { cache: "no-store" });

  if (!quote) {
    return NextResponse.json(
      { error: "종목을 찾을 수 없습니다. 심볼을 확인하세요." },
      { status: 404 },
    );
  }

  return NextResponse.json({
    symbol: normalized,
    name: quote.name,
    market,
    currency: getCurrency(market),
    yahooSymbol,
    currentPrice: quote.price,
    changePercent: quote.changePercent,
  });
}

export async function POST() {
  const fx = await fetchUsdKrwRate();
  return NextResponse.json(fx);
}
