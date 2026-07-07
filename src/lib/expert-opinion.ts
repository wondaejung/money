import {
  callLlmJson,
  hasLlmCredentials,
} from "@/lib/llm-briefing";
import { getLlmStoreJson, setLlmStoreJson } from "@/lib/llm-store";
import { buildJsonSystemPrompt } from "@/lib/llm-prompt";
import type {
  ExpertOpinionReport,
  ExpertStance,
  ExpertVideoSummary,
} from "@/types/expert";

const CHANNEL_ID =
  process.env.EXPERT_CHANNEL_ID ?? "UC6kZpTl39-_SqfBrF1-N2oQ";
const CHANNEL_NAME = process.env.EXPERT_CHANNEL_NAME ?? "연합뉴스경제TV";
const EXPERT_NAME = process.env.EXPERT_NAME ?? "김민수";

const STORE_KEY = "expert:kimminsu:latest";
const STORE_TTL_SECONDS = 7 * 24 * 60 * 60;
const MAX_VIDEOS = 3;
const MAX_TRANSCRIPT_CHARS = 6000;

const FETCH_HEADERS = {
  "Accept-Language": "ko-KR,ko;q=0.9",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36",
};

export interface FoundVideo {
  videoId: string;
  title: string;
  publishedText: string;
}

export interface ExpertVideoInput extends FoundVideo {
  transcript: string | null;
}

const RECENT_MAX_DAYS = 7;

function isRecentVideo(publishedText: string): boolean {
  if (!publishedText) return true;
  if (/(분|시간)\s*전/.test(publishedText)) return true;
  const days = publishedText.match(/(\d+)일\s*전/);
  if (days) return Number(days[1]) <= RECENT_MAX_DAYS;
  // "N주 전", "N개월 전", "N년 전" 등은 제외
  return false;
}

function collectVideoRenderers(node: unknown, out: unknown[]): void {
  if (!node || typeof node !== "object") return;

  if (Array.isArray(node)) {
    for (const item of node) collectVideoRenderers(item, out);
    return;
  }

  const record = node as Record<string, unknown>;
  if (record.videoRenderer) out.push(record.videoRenderer);

  for (const value of Object.values(record)) {
    collectVideoRenderers(value, out);
  }
}

export async function searchExpertVideos(): Promise<FoundVideo[]> {
  const query = encodeURIComponent(`${CHANNEL_NAME} ${EXPERT_NAME}`);
  // sp=CAI%3D → 업로드 날짜순 정렬
  const response = await fetch(
    `https://www.youtube.com/results?search_query=${query}&sp=CAI%253D`,
    { headers: FETCH_HEADERS, cache: "no-store" },
  );
  if (!response.ok) {
    throw new Error(`유튜브 검색 실패 (HTTP ${response.status})`);
  }

  const html = await response.text();
  const match = html.match(/var ytInitialData = (\{[\s\S]+?\});<\/script>/);
  if (!match) {
    throw new Error("유튜브 검색 결과를 파싱하지 못했습니다.");
  }

  const data = JSON.parse(match[1]) as unknown;
  const renderers: unknown[] = [];
  collectVideoRenderers(data, renderers);

  const videos: FoundVideo[] = [];
  for (const renderer of renderers) {
    const vr = renderer as {
      videoId?: string;
      title?: { runs?: Array<{ text?: string }> };
      publishedTimeText?: { simpleText?: string };
      ownerText?: {
        runs?: Array<{
          navigationEndpoint?: { browseEndpoint?: { browseId?: string } };
        }>;
      };
    };

    const videoId = vr.videoId;
    const title = vr.title?.runs?.map((run) => run.text ?? "").join("") ?? "";
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

interface CaptionTrack {
  baseUrl?: string;
  languageCode?: string;
  kind?: string;
}

function decodeXmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

export async function fetchTranscript(
  videoId: string,
): Promise<string | null> {
  try {
    // WEB 클라이언트 자막 URL은 poToken을 요구하므로 ANDROID innertube 사용
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
        cache: "no-store",
      },
    );
    if (!playerResponse.ok) return null;

    const player = (await playerResponse.json()) as {
      captions?: {
        playerCaptionsTracklistRenderer?: { captionTracks?: CaptionTrack[] };
      };
    };

    const tracks =
      player.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? [];
    const track =
      tracks.find((t) => t.languageCode === "ko" && t.kind !== "asr") ??
      tracks.find((t) => t.languageCode === "ko") ??
      tracks[0];
    if (!track?.baseUrl) return null;

    const captionResponse = await fetch(track.baseUrl, {
      cache: "no-store",
    });
    if (!captionResponse.ok) return null;

    // srv3(timedtext XML) 형식: <p t="..." d="...">내용</p>
    const xml = await captionResponse.text();
    const text = decodeXmlEntities(
      [...xml.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)]
        .map((match) => match[1].replace(/<[^>]+>/g, ""))
        .join(" "),
    )
      .replace(/\s+/g, " ")
      .trim();

    if (!text) return null;
    return text.slice(0, MAX_TRANSCRIPT_CHARS);
  } catch {
    return null;
  }
}

const VALID_STANCES = new Set<ExpertStance>(["bullish", "bearish", "neutral"]);

const SYSTEM_PROMPT = buildJsonSystemPrompt({
  role: `증권방송 발언 요약가. ${CHANNEL_NAME}에서 ${EXPERT_NAME} 팀장이 말한 내용의 핵심만 추출.`,
  schema: `{
  "items": [
    {
      "videoId": "string",
      "headline": "string",
      "keyPoints": ["string"],
      "stance": "bullish" | "bearish" | "neutral",
      "topics": ["string"]
    }
  ],
  "dailyTakeaway": "string"
}`,
  rules: [
    "한국어, headline 35자·keyPoint 60자 이내",
    `keyPoints 3~5개 — ${EXPERT_NAME} 팀장 발언(시장 판단·종목·전략) 중심`,
    "topics는 언급된 종목·테마명 2~4개",
    "dailyTakeaway 1~2문장 — 오늘 발언 전체를 관통하는 결론",
    "CAPTION이 없으면 제목만 근거로 보수적으로 요약, 수치·종목 창작 금지",
    "입력 videoId 전부 포함",
  ],
});

interface LlmExpertItem {
  videoId: string;
  headline: string;
  keyPoints: string[];
  stance: ExpertStance;
  topics: string[];
}

interface LlmExpertContent {
  items: LlmExpertItem[];
  dailyTakeaway: string;
}

export function parseLlmExpertContent(raw: unknown): LlmExpertContent | null {
  if (!raw || typeof raw !== "object") return null;

  const payload = raw as Record<string, unknown>;
  if (!Array.isArray(payload.items)) return null;

  const items: LlmExpertItem[] = [];
  for (const entry of payload.items) {
    if (!entry || typeof entry !== "object") continue;
    const item = entry as Record<string, unknown>;

    if (typeof item.videoId !== "string" || typeof item.headline !== "string") {
      continue;
    }

    items.push({
      videoId: item.videoId,
      headline: item.headline.trim(),
      keyPoints: Array.isArray(item.keyPoints)
        ? item.keyPoints
            .filter((point): point is string => typeof point === "string")
            .map((point) => point.trim())
            .slice(0, 5)
        : [],
      stance: VALID_STANCES.has(item.stance as ExpertStance)
        ? (item.stance as ExpertStance)
        : "neutral",
      topics: Array.isArray(item.topics)
        ? item.topics
            .filter((topic): topic is string => typeof topic === "string")
            .slice(0, 4)
        : [],
    });
  }

  if (items.length === 0) return null;

  return {
    items,
    dailyTakeaway:
      typeof payload.dailyTakeaway === "string"
        ? payload.dailyTakeaway.trim()
        : "",
  };
}

function buildUserPrompt(videos: ExpertVideoInput[]): string {
  const blocks = videos.map((video) => {
    const caption = video.transcript
      ? `CAPTION ${video.transcript}`
      : "CAPTION 없음";
    return `VIDEO id=${video.videoId}\nTITLE ${video.title}\n${caption}`;
  });

  return `EXPERT_REVIEW expert=${EXPERT_NAME}\n${blocks.join("\n---\n")}`;
}

export async function generateExpertOpinion(): Promise<ExpertOpinionReport> {
  const found = await searchExpertVideos();

  if (found.length === 0) {
    const report: ExpertOpinionReport = {
      expertName: EXPERT_NAME,
      channelName: CHANNEL_NAME,
      generatedAt: new Date().toISOString(),
      videos: [],
      dailyTakeaway: "",
      summarySource: "rule",
    };
    await setLlmStoreJson(STORE_KEY, report, STORE_TTL_SECONDS);
    return report;
  }

  const withTranscripts = await Promise.all(
    found.map(async (video) => ({
      ...video,
      transcript: await fetchTranscript(video.videoId),
    })),
  );

  return buildAndStoreReport(withTranscripts);
}

/**
 * 수집이 끝난 영상(자막 포함 가능)을 요약해 저장한다.
 * Vercel IP는 유튜브 자막이 차단되므로, 로컬 PC가 자막을 수집해
 * ingest 라우트로 보내는 경우에도 이 함수를 공유한다.
 */
export async function buildAndStoreReport(
  withTranscripts: ExpertVideoInput[],
): Promise<ExpertOpinionReport> {
  let items: LlmExpertItem[] | null = null;
  let dailyTakeaway = "";
  let summarySource: "llm" | "rule" = "rule";
  let llmError: string | undefined;

  if (hasLlmCredentials()) {
    const result = await callLlmJson(
      SYSTEM_PROMPT,
      buildUserPrompt(withTranscripts),
      parseLlmExpertContent,
    );

    if (result.data) {
      items = result.data.items;
      dailyTakeaway = result.data.dailyTakeaway;
      summarySource = "llm";
    } else {
      llmError = result.error;
    }
  } else {
    llmError =
      "LLM이 비활성 상태입니다. (개발 모드 기본 비활성 · LLM_DISABLED=false로 활성화)";
  }

  const itemMap = new Map((items ?? []).map((item) => [item.videoId, item]));

  const videos: ExpertVideoSummary[] = withTranscripts.map((video) => {
    const item = itemMap.get(video.videoId);
    return {
      videoId: video.videoId,
      title: video.title,
      url: `https://www.youtube.com/watch?v=${video.videoId}`,
      publishedText: video.publishedText,
      hasTranscript: Boolean(video.transcript),
      headline: item?.headline ?? video.title,
      keyPoints: item?.keyPoints ?? [],
      stance: item?.stance ?? "neutral",
      topics: item?.topics ?? [],
    };
  });

  const report: ExpertOpinionReport = {
    expertName: EXPERT_NAME,
    channelName: CHANNEL_NAME,
    generatedAt: new Date().toISOString(),
    videos,
    dailyTakeaway,
    summarySource,
    llmError,
  };

  await setLlmStoreJson(STORE_KEY, report, STORE_TTL_SECONDS);
  return report;
}

export async function getStoredExpertOpinion(): Promise<ExpertOpinionReport | null> {
  return getLlmStoreJson<ExpertOpinionReport>(STORE_KEY);
}
