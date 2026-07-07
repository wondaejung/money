import { NextResponse } from "next/server";

import { generateExpertOpinion } from "@/lib/expert-opinion";

export const maxDuration = 60;

export async function GET(request: Request) {
  // Vercel Cron은 CRON_SECRET 설정 시 Authorization 헤더를 자동으로 붙인다.
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  try {
    const report = await generateExpertOpinion();
    return NextResponse.json({
      ok: true,
      videos: report.videos.length,
      summarySource: report.summarySource,
      generatedAt: report.generatedAt,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "생성에 실패했습니다.",
      },
      { status: 502 },
    );
  }
}
