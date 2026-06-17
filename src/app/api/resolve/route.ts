import { NextResponse } from "next/server";

import { resolveStockByName } from "@/lib/resolve-stock";
import type { Market } from "@/types/market";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    name?: string;
    market?: Market;
  };

  const name = body.name?.trim();
  if (!name) {
    return NextResponse.json({ error: "종목명을 입력하세요." }, { status: 400 });
  }

  const resolved = await resolveStockByName(name, body.market);

  if (!resolved) {
    return NextResponse.json(
      { error: `"${name}" 종목을 찾을 수 없습니다. 이름을 다시 확인해 주세요.` },
      { status: 404 },
    );
  }

  return NextResponse.json(resolved);
}
