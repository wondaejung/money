import { NextResponse } from "next/server";

import { fetchDisclosures, isDartConfigured } from "@/lib/dart";
import type { DisclosureApiResponse } from "@/types/disclosure";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbols = (searchParams.get("symbols") ?? "")
    .split(",")
    .map((symbol) => symbol.trim())
    .filter(Boolean)
    .slice(0, 30);

  if (!isDartConfigured()) {
    return NextResponse.json<DisclosureApiResponse>({
      disclosures: [],
      configured: false,
      fetchedAt: new Date().toISOString(),
    });
  }

  if (symbols.length === 0) {
    return NextResponse.json<DisclosureApiResponse>({
      disclosures: [],
      configured: true,
      fetchedAt: new Date().toISOString(),
    });
  }

  try {
    const disclosures = await fetchDisclosures(symbols);
    return NextResponse.json<DisclosureApiResponse>({
      disclosures,
      configured: true,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json<DisclosureApiResponse>(
      {
        disclosures: [],
        configured: true,
        fetchedAt: new Date().toISOString(),
        error:
          error instanceof Error
            ? error.message
            : "공시 데이터를 가져오지 못했습니다.",
      },
      { status: 502 },
    );
  }
}
