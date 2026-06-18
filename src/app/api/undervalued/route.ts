import { NextResponse } from "next/server";

import { fetchLiveUndervaluedPicks } from "@/lib/undervalued-live";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const CACHE_TTL_MS = 60_000;

let cache: {
  payload: Awaited<ReturnType<typeof fetchLiveUndervaluedPicks>>;
  expiresAt: number;
} | null = null;

export function clearUndervaluedCache(): void {
  cache = null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const forceRefresh = searchParams.get("refresh") === "true";

  if (forceRefresh) {
    clearUndervaluedCache();
  }

  try {
    if (!forceRefresh && cache && Date.now() < cache.expiresAt) {
      return NextResponse.json(cache.payload);
    }

    const data = await fetchLiveUndervaluedPicks();

    if (data.picks.length === 0) {
      return NextResponse.json(
        { error: "네이버 증권에서 저평가 종목을 가져오지 못했습니다." },
        { status: 502 },
      );
    }

    cache = {
      payload: data,
      expiresAt: Date.now() + CACHE_TTL_MS,
    };

    return NextResponse.json(data);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "저평가 데이터를 불러오지 못했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
