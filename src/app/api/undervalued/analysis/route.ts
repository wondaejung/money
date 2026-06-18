import { NextResponse } from "next/server";

import { generateUndervaluedDeepAnalysis } from "@/lib/llm-undervalued-analysis";
import type { UndervaluedTheme } from "@/types/undervalued";
import { UNDERVALUED_THEME_LABELS } from "@/types/undervalued";
import type { UndervaluedAnalysisApiResponse } from "@/types/undervalued-analysis";

const VALID_THEMES = new Set<UndervaluedTheme>([
  "semiconductor",
  "bio",
  "battery",
  "auto",
  "finance",
  "platform",
]);

function parseNumber(value: string | null, fallback = 0): number {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ticker = searchParams.get("ticker")?.trim();
  const name = searchParams.get("name")?.trim();
  const theme = searchParams.get("theme")?.trim() as UndervaluedTheme | undefined;
  const skipCache = searchParams.get("refresh") === "true";

  if (!ticker || !name || !theme || !VALID_THEMES.has(theme)) {
    return NextResponse.json(
      { error: "ticker, name, theme 파라미터가 필요합니다." },
      { status: 400 },
    );
  }

  try {
    const result = await generateUndervaluedDeepAnalysis(
      {
        ticker,
        name,
        theme,
        themeLabel: UNDERVALUED_THEME_LABELS[theme],
        per: parseNumber(searchParams.get("per")),
        sectorAvgPer: parseNumber(searchParams.get("sectorAvgPer")),
        pbr: parseNumber(searchParams.get("pbr")),
        roe: parseNumber(searchParams.get("roe")),
        discountPercent: parseNumber(searchParams.get("discountPercent")),
      },
      { skipCache },
    );

    const response: UndervaluedAnalysisApiResponse = {
      analysis: result.analysis,
      cached: result.cached,
      llmAvailable: result.llmAvailable,
      fetchedAt: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "심층 분석을 생성하지 못했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
