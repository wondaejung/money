import { NextResponse } from "next/server";

export const maxDuration = 60;

const CLIENTS: Array<{ name: string; body: Record<string, unknown> }> = [
  {
    name: "ANDROID",
    body: {
      clientName: "ANDROID",
      clientVersion: "20.10.38",
      androidSdkVersion: 30,
      hl: "ko",
      gl: "KR",
    },
  },
  {
    name: "IOS",
    body: {
      clientName: "IOS",
      clientVersion: "20.10.4",
      deviceMake: "Apple",
      deviceModel: "iPhone16,2",
      hl: "ko",
      gl: "KR",
    },
  },
  {
    name: "MWEB",
    body: { clientName: "MWEB", clientVersion: "2.20250101.00.00", hl: "ko" },
  },
  {
    name: "WEB_EMBEDDED_PLAYER",
    body: {
      clientName: "WEB_EMBEDDED_PLAYER",
      clientVersion: "1.20250101.00.00",
      hl: "ko",
    },
  },
  {
    name: "TVHTML5_SIMPLY_EMBEDDED_PLAYER",
    body: {
      clientName: "TVHTML5_SIMPLY_EMBEDDED_PLAYER",
      clientVersion: "2.0",
      hl: "ko",
    },
  },
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get("videoId") ?? "D-la2fy8O6I";

  const results: Record<string, unknown> = {};

  for (const client of CLIENTS) {
    try {
      const playerResponse = await fetch(
        "https://www.youtube.com/youtubei/v1/player?prettyPrint=false",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            context: { client: client.body },
            videoId,
            contentCheckOk: true,
            racyCheckOk: true,
          }),
          cache: "no-store",
        },
      );

      if (!playerResponse.ok) {
        results[client.name] = { playerHttp: playerResponse.status };
        continue;
      }

      const player = (await playerResponse.json()) as {
        playabilityStatus?: { status?: string; reason?: string };
        captions?: {
          playerCaptionsTracklistRenderer?: {
            captionTracks?: Array<{ baseUrl?: string; languageCode?: string }>;
          };
        };
      };

      const tracks =
        player.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? [];
      const entry: Record<string, unknown> = {
        playability: player.playabilityStatus?.status,
        reason: player.playabilityStatus?.reason?.slice(0, 80),
        tracks: tracks.map((t) => t.languageCode),
      };

      const track = tracks.find((t) => t.languageCode === "ko") ?? tracks[0];
      if (track?.baseUrl) {
        const captionResponse = await fetch(track.baseUrl, {
          cache: "no-store",
        });
        const text = await captionResponse.text();
        entry.captionHttp = captionResponse.status;
        entry.captionLen = text.length;
      }

      results[client.name] = entry;
    } catch (error) {
      results[client.name] = {
        error: error instanceof Error ? error.message.slice(0, 120) : "err",
      };
    }
  }

  return NextResponse.json(results);
}
