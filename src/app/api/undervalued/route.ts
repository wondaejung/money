import { NextResponse } from "next/server";

import { fetchLiveUndervaluedPicks } from "@/lib/undervalued-live";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await fetchLiveUndervaluedPicks();
    return NextResponse.json(data);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "저평가 데이터를 불러오지 못했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
