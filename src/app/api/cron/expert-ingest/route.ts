import { NextResponse } from "next/server";

import { buildAndStoreReport, type ExpertVideoInput } from "@/lib/expert-opinion";

export const maxDuration = 60;

const MAX_VIDEOS = 3;
const MAX_TRANSCRIPT_CHARS = 6000;
const MAX_TITLE_CHARS = 200;

function resolveIngestSecret(): string | null {
  return process.env.CRON_SECRET ?? process.env.ADMIN_PASSWORD ?? null;
}

export async function POST(request: Request) {
  const secret = resolveIngestSecret();
  if (!secret || request.headers.get("x-ingest-secret") !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { videos?: unknown };
  try {
    body = (await request.json()) as { videos?: unknown };
  } catch {
    return NextResponse.json({ error: "잘못된 요청 형식" }, { status: 400 });
  }

  if (!Array.isArray(body.videos) || body.videos.length === 0) {
    return NextResponse.json(
      { error: "videos 배열이 비어 있습니다." },
      { status: 400 },
    );
  }

  const videos: ExpertVideoInput[] = [];
  for (const entry of body.videos.slice(0, MAX_VIDEOS)) {
    if (!entry || typeof entry !== "object") continue;
    const video = entry as Record<string, unknown>;

    if (
      typeof video.videoId !== "string" ||
      !/^[\w-]{11}$/.test(video.videoId) ||
      typeof video.title !== "string"
    ) {
      continue;
    }

    videos.push({
      videoId: video.videoId,
      title: video.title.slice(0, MAX_TITLE_CHARS),
      publishedText:
        typeof video.publishedText === "string"
          ? video.publishedText.slice(0, 30)
          : "",
      transcript:
        typeof video.transcript === "string" && video.transcript.length > 0
          ? video.transcript.slice(0, MAX_TRANSCRIPT_CHARS)
          : null,
    });
  }

  if (videos.length === 0) {
    return NextResponse.json(
      { error: "유효한 영상 항목이 없습니다." },
      { status: 400 },
    );
  }

  try {
    const report = await buildAndStoreReport(videos);
    return NextResponse.json({
      ok: true,
      videos: report.videos.length,
      withTranscript: report.videos.filter((v) => v.hasTranscript).length,
      summarySource: report.summarySource,
      llmError: report.llmError,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "요약에 실패했습니다.",
      },
      { status: 502 },
    );
  }
}
