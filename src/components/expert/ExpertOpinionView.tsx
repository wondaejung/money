"use client";

import { useCallback, useEffect, useState } from "react";

import {
  ExternalLink,
  Quote,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Minus,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type {
  ExpertOpinionApiResponse,
  ExpertOpinionReport,
  ExpertStance,
} from "@/types/expert";

const STANCE_META: Record<
  ExpertStance,
  { label: string; className: string; icon: typeof TrendingUp }
> = {
  bullish: {
    label: "긍정적",
    className: "bg-red-500/10 text-red-600 border-red-200",
    icon: TrendingUp,
  },
  bearish: {
    label: "신중·경계",
    className: "bg-blue-500/10 text-blue-600 border-blue-200",
    icon: TrendingDown,
  },
  neutral: {
    label: "중립",
    className: "bg-muted text-muted-foreground border-border",
    icon: Minus,
  },
};

function formatGeneratedAt(iso: string): string {
  return new Date(iso).toLocaleString("ko-KR", {
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ExpertOpinionView() {
  const [report, setReport] = useState<ExpertOpinionReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (refresh: boolean) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/expert-opinion${refresh ? "?refresh=1" : ""}`,
        { cache: "no-store" },
      );
      const data = (await response.json()) as ExpertOpinionApiResponse;

      if (data.report) {
        setReport(data.report);
      }
      if (data.error) {
        setError(data.error);
      }
    } catch {
      setError("전문가 의견을 가져오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(false);
  }, [load]);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-4 sm:gap-8 sm:px-6 sm:py-8">
      <header className="space-y-1">
        <p className="text-sm font-medium text-muted-foreground">
          Expert Opinion
        </p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          전문가 의견 — 김민수 팀장
        </h1>
        <p className="text-sm text-muted-foreground">
          연합뉴스경제TV 출연분을 매일 22시에 자동 수집·요약합니다. (투자
          참고용, 원문은 영상 링크 확인)
        </p>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {report && (
            <>
              <Badge variant="secondary">
                {formatGeneratedAt(report.generatedAt)} 생성
              </Badge>
              <Badge variant={report.summarySource === "llm" ? "secondary" : "outline"}>
                {report.summarySource === "llm" ? "AI 요약" : "제목 기반"}
              </Badge>
            </>
          )}
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => void load(true)}
          disabled={loading}
        >
          <RefreshCw
            className={cn("h-3.5 w-3.5", loading && "animate-spin")}
            aria-hidden
          />
          지금 다시 수집
        </Button>
      </div>

      {error && (
        <p className="rounded-lg border border-amber-300/50 bg-amber-50/50 px-4 py-3 text-sm text-amber-700">
          {error}
        </p>
      )}

      {loading && !report ? (
        <div className="space-y-4">
          <div className="h-24 animate-pulse rounded-xl bg-muted" />
          <div className="h-48 animate-pulse rounded-xl bg-muted" />
          <div className="h-48 animate-pulse rounded-xl bg-muted" />
        </div>
      ) : !report || report.videos.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            최근 김민수 팀장 출연 영상을 찾지 못했습니다. 22시 자동 수집을
            기다리거나 &quot;지금 다시 수집&quot;을 눌러 보세요.
          </CardContent>
        </Card>
      ) : (
        <>
          {report.dailyTakeaway && (
            <section className="rounded-xl border bg-card p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <Quote
                  className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground"
                  aria-hidden
                />
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    오늘의 핵심 결론
                  </p>
                  <p className="mt-1 text-base font-medium leading-relaxed sm:text-lg">
                    {report.dailyTakeaway}
                  </p>
                </div>
              </div>
            </section>
          )}

          <div className="space-y-4">
            {report.videos.map((video) => {
              const stance = STANCE_META[video.stance];
              const StanceIcon = stance.icon;

              return (
                <Card key={video.videoId}>
                  <CardHeader className="pb-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <CardTitle className="text-base leading-snug">
                        {video.headline}
                      </CardTitle>
                      <span
                        className={cn(
                          "flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium",
                          stance.className,
                        )}
                      >
                        <StanceIcon className="h-3.5 w-3.5" aria-hidden />
                        {stance.label}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {video.keyPoints.length > 0 && (
                      <ul className="space-y-1.5">
                        {video.keyPoints.map((point, index) => (
                          <li
                            key={index}
                            className="flex gap-2 text-sm leading-relaxed"
                          >
                            <span className="text-muted-foreground">·</span>
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    )}

                    {video.topics.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {video.topics.map((topic) => (
                          <Badge
                            key={topic}
                            variant="outline"
                            className="text-xs font-normal"
                          >
                            #{topic}
                          </Badge>
                        ))}
                      </div>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
                      <a
                        href={video.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground hover:text-foreground hover:underline"
                      >
                        <span className="truncate">{video.title}</span>
                        <ExternalLink className="h-3 w-3 shrink-0" aria-hidden />
                      </a>
                      <div className="flex shrink-0 items-center gap-2 text-[11px] text-muted-foreground">
                        {video.publishedText && (
                          <span>{video.publishedText}</span>
                        )}
                        {!video.hasTranscript && (
                          <Badge variant="outline" className="text-[10px]">
                            자막 없음 · 제목 기반
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
