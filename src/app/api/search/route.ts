import { NextResponse } from "next/server";

import { searchStocks } from "@/lib/yahoo-search";
import type { Market } from "@/types/market";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");
  const market = searchParams.get("market") as Market | null;

  if (!query?.trim()) {
    return NextResponse.json({ results: [] });
  }

  const results = await searchStocks(query, market ?? undefined);

  return NextResponse.json({ results });
}
