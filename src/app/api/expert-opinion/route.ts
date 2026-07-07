import { NextResponse } from "next/server";

import {
  generateExpertOpinion,
  getStoredExpertOpinion,
} from "@/lib/expert-opinion";
import type { ExpertOpinionApiResponse } from "@/types/expert";

export const maxDuration = 60;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const forceRefresh = searchParams.get("refresh") === "1";

  try {
    if (!forceRefresh) {
      const stored = await getStoredExpertOpinion();
      if (stored) {
        return NextResponse.json<ExpertOpinionApiResponse>({ report: stored });
      }
    }

    const report = await generateExpertOpinion();
    return NextResponse.json<ExpertOpinionApiResponse>({ report });
  } catch (error) {
    return NextResponse.json<ExpertOpinionApiResponse>(
      {
        report: null,
        error:
          error instanceof Error
            ? error.message
            : "전문가 의견을 가져오지 못했습니다.",
      },
      { status: 502 },
    );
  }
}
