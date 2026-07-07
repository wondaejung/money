// 로컬 PC에서 유튜브 자막을 수집해 배포 서버로 보내는 스크립트.
// Vercel IP는 유튜브가 차단하므로(LOGIN_REQUIRED) 자막 수집만 이 PC에서 수행한다.
//
// 실행:  node scripts/expert-local-refresh.mjs
// 자동화: Windows 작업 스케줄러로 매일 22:05 실행 (Vercel 크론 22:00의 제목 기반
//         리포트를 자막 포함 버전으로 덮어씀)

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PROD_URL = process.env.EXPERT_PROD_URL ?? "https://money-nine-wine.vercel.app";
const CHANNEL_ID = "UC6kZpTl39-_SqfBrF1-N2oQ";
const CHANNEL_NAME = "연합뉴스경제TV";
const EXPERT_NAME = "김민수";
const MAX_VIDEOS = 3;
const MAX_TRANSCRIPT_CHARS = 6000;
const RECENT_MAX_DAYS = 7;

function loadEnv() {
  const env = {};
  const raw = readFileSync(join(ROOT, ".env"), "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const match = line.match(/^([A-Z_]+)=(.*)$/);
    if (match) env[match[1]] = match[2].trim();
  }
  return env;
}

function isRecentVideo(publishedText) {
  if (!publishedText) return true;
  if (/(분|시간)\s*전/.test(publishedText)) return true;
  const days = publishedText.match(/(\d+)일\s*전/);
  if (days) return Number(days[1]) <= RECENT_MAX_DAYS;
  return false;
}

function collectVideoRenderers(node, out) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const item of node) collectVideoRenderers(item, out);
    return;
  }
  if (node.videoRenderer) out.push(node.videoRenderer);
  for (const value of Object.values(node)) collectVideoRenderers(value, out);
}

async function searchExpertVideos() {
  const query = encodeURIComponent(`${CHANNEL_NAME} ${EXPERT_NAME}`);
  const response = await fetch(
    `https://www.youtube.com/results?search_query=${query}&sp=CAI%253D`,
    { headers: { "Accept-Language": "ko-KR,ko;q=0.9" } },
  );
  if (!response.ok) throw new Error(`유튜브 검색 실패 HTTP ${response.status}`);

  const html = await response.text();
  const match = html.match(/var ytInitialData = (\{[\s\S]+?\});<\/script>/);
  if (!match) throw new Error("유튜브 검색 결과 파싱 실패");

  const renderers = [];
  collectVideoRenderers(JSON.parse(match[1]), renderers);

  const videos = [];
  for (const vr of renderers) {
    const videoId = vr.videoId;
    const title = (vr.title?.runs ?? []).map((run) => run.text ?? "").join("");
    const ownerId =
      vr.ownerText?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseId;
    const publishedText = vr.publishedTimeText?.simpleText ?? "";

    if (!videoId || !title) continue;
    if (ownerId !== CHANNEL_ID) continue;
    if (!title.includes(EXPERT_NAME)) continue;
    if (!isRecentVideo(publishedText)) continue;
    if (videos.some((video) => video.videoId === videoId)) continue;

    videos.push({ videoId, title, publishedText });
    if (videos.length >= MAX_VIDEOS) break;
  }
  return videos;
}

function decodeXmlEntities(text) {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

async function fetchTranscript(videoId) {
  try {
    const playerResponse = await fetch(
      "https://www.youtube.com/youtubei/v1/player?prettyPrint=false",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          context: {
            client: {
              clientName: "ANDROID",
              clientVersion: "20.10.38",
              androidSdkVersion: 30,
              hl: "ko",
              gl: "KR",
            },
          },
          videoId,
        }),
      },
    );
    if (!playerResponse.ok) return null;

    const player = await playerResponse.json();
    const tracks =
      player.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? [];
    const track =
      tracks.find((t) => t.languageCode === "ko" && t.kind !== "asr") ??
      tracks.find((t) => t.languageCode === "ko") ??
      tracks[0];
    if (!track?.baseUrl) return null;

    const captionResponse = await fetch(track.baseUrl);
    if (!captionResponse.ok) return null;

    const xml = await captionResponse.text();
    const text = decodeXmlEntities(
      [...xml.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)]
        .map((match) => match[1].replace(/<[^>]+>/g, ""))
        .join(" "),
    )
      .replace(/\s+/g, " ")
      .trim();

    return text ? text.slice(0, MAX_TRANSCRIPT_CHARS) : null;
  } catch {
    return null;
  }
}

async function main() {
  const env = loadEnv();
  const secret = env.CRON_SECRET || env.ADMIN_PASSWORD;
  if (!secret) throw new Error(".env에 CRON_SECRET 또는 ADMIN_PASSWORD가 필요합니다.");

  console.log(`[expert] ${CHANNEL_NAME} ${EXPERT_NAME} 영상 검색…`);
  const videos = await searchExpertVideos();
  if (videos.length === 0) {
    console.log("[expert] 최근 7일 내 영상 없음 — 종료");
    return;
  }

  for (const video of videos) {
    video.transcript = await fetchTranscript(video.videoId);
    console.log(
      `[expert] ${video.videoId} (${video.publishedText}) 자막 ${video.transcript ? `${video.transcript.length}자` : "없음"} — ${video.title.slice(0, 40)}…`,
    );
  }

  console.log(`[expert] 서버로 전송: ${PROD_URL}`);
  const response = await fetch(`${PROD_URL}/api/cron/expert-ingest`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-ingest-secret": secret,
    },
    body: JSON.stringify({ videos }),
  });

  const result = await response.json();
  console.log(`[expert] HTTP ${response.status}`, result);
  if (!response.ok) process.exitCode = 1;
}

main().catch((error) => {
  console.error("[expert] 실패:", error.message);
  process.exitCode = 1;
});
