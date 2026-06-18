"use client";

import { FileText, RefreshCw, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useDailyReport } from "@/hooks/use-daily-report";

const PROVIDER_LABEL: Record<string, string> = {
  groq: "Groq",
  gemini: "Gemini",
  openai: "OpenAI",
  anthropic: "Anthropic",
  ollama: "Ollama",
};

function formatReportDate(ymd: string): string {
  const [year, month, day] = ymd.split("-").map(Number);
  return `${year}년 ${month}월 ${day}일`;
}

export function DailyMarketReport() {
  const {
    report,
    pending,
    pendingMessage,
    loading,
    error,
    fetchedAt,
    refresh,
  } = useDailyReport();

  const providerLabel = report?.llmProvider
    ? PROVIDER_LABEL[report.llmProvider]
    : null;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="size-5 text-muted-foreground" />
            <h2 className="text-xl font-semibold">오늘의 국내 증시 요약</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            장중 이슈와 시간외 마감 데이터를 바탕으로 핵심 3가지를 요약합니다.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {report && (
            <Badge variant={report.reportSource === "llm" ? "default" : "outline"}>
              {report.reportSource === "llm"
                ? `AI 리포트${providerLabel ? ` · ${providerLabel}` : ""}`
                : "룰 기반 리포트"}
            </Badge>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => void refresh()}
            disabled={loading}
          >
            <RefreshCw className={loading ? "size-4 animate-spin" : "size-4"} />
            새로고침
          </Button>
        </div>
      </div>

      {pending && pendingMessage && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="py-3 text-sm text-amber-900 dark:text-amber-100">
            {pendingMessage}
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="border-destructive/40">
          <CardContent className="py-4 text-sm text-destructive">
            {error}
          </CardContent>
        </Card>
      )}

      {loading && !report && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            일일 보고서를 불러오는 중…
          </CardContent>
        </Card>
      )}

      {report && (
        <div className="space-y-4">
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="pb-2">
              <CardDescription>
                {formatReportDate(report.targetDate)} · {report.closedAtLabel}
              </CardDescription>
              <CardTitle className="text-lg leading-snug sm:text-xl">
                {report.headline}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">3대 핵심 팩트</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {report.facts.map((fact, index) => (
                  <li
                    key={index}
                    className="flex gap-3 text-sm leading-relaxed sm:text-base"
                  >
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                      {index + 1}
                    </span>
                    <span>{fact}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-primary" />
                <CardTitle className="text-base">내 자산 영향도</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed sm:text-base">
                {report.portfolioImpact}
              </p>
            </CardContent>
          </Card>

          {report.llmError && (
            <p className="text-xs text-muted-foreground">
              AI 생성 실패 — 룰 기반 요약으로 대체됨: {report.llmError}
            </p>
          )}

          {fetchedAt && (
            <p className="text-xs text-muted-foreground">
              갱신: {new Date(fetchedAt).toLocaleString("ko-KR")}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
