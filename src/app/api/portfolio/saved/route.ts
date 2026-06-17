import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { AUTH_COOKIE_NAME, verifySessionToken } from "@/lib/auth";
import {
  getPortfolioFromStore,
  isPortfolioStoreConfigured,
  setPortfolioInStore,
} from "@/lib/portfolio-kv";
import type { UserPosition } from "@/types/portfolio";

async function getAuthedEmail(): Promise<string | null> {
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;
  const session = await verifySessionToken(token);
  return session?.email ?? null;
}

export async function GET() {
  const email = await getAuthedEmail();
  if (!email) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  if (!isPortfolioStoreConfigured()) {
    return NextResponse.json(
      { error: "서버 포트폴리오 저장소가 설정되지 않았습니다." },
      { status: 501 },
    );
  }

  const key = `portfolio:${email}`;
  const positions =
    (await getPortfolioFromStore<UserPosition[]>(key)) ?? [];
  return NextResponse.json({ positions });
}

export async function POST(request: Request) {
  const email = await getAuthedEmail();
  if (!email) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  if (!isPortfolioStoreConfigured()) {
    return NextResponse.json(
      { error: "서버 포트폴리오 저장소가 설정되지 않았습니다." },
      { status: 501 },
    );
  }

  let body: { positions?: UserPosition[] };
  try {
    body = (await request.json()) as { positions?: UserPosition[] };
  } catch {
    return NextResponse.json(
      { error: "요청 형식이 올바르지 않습니다." },
      { status: 400 },
    );
  }

  const positions = body.positions;
  if (!Array.isArray(positions)) {
    return NextResponse.json(
      { error: "positions가 올바르지 않습니다." },
      { status: 400 },
    );
  }

  const key = `portfolio:${email}`;
  await setPortfolioInStore(key, positions);

  return NextResponse.json({ ok: true });
}

