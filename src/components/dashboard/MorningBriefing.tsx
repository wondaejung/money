"use client";

import {
  ThemeMapper,
  UsMarketSummary,
} from "@/components/dashboard/ThemeMapper";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useBriefing } from "@/hooks/use-briefing";

const PROVIDER_LABEL: Record<string, string> = {
  groq: "Groq",
  gemini: "Gemini",
  openai: "OpenAI",
  anthropic: "Anthropic",
  ollama: "Ollama",
};

export function MorningBriefing() {
  const {
    usIndices,
    overnightIssues,
    themeForecasts,
    fetchedAt,
    briefingSource,
    llmProvider,
    llmError,
    loading,
    error,
    refresh,
  } = useBriefing();

  const providerLabel = llmProvider ? PROVIDER_LABEL[llmProvider] : null;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">모닝 브리핑</h2>
          <p className="text-sm text-muted-foreground">
            밤사이 미국 증시 · 글로벌 이슈를 오늘 한국 증시 테마로 연결합니다.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">지수 실시간</Badge>
          <Badge variant={briefingSource === "llm" ? "default" : "outline"}>
            {briefingSource === "llm"
              ? `AI 브리핑${providerLabel ? ` · ${providerLabel}` : ""}`
              : "목데이터 브리핑"}
          </Badge>
          {fetchedAt && (
            <span className="text-xs text-muted-foreground">
              {new Date(fetchedAt).toLocaleTimeString("ko-KR", {
                hour: "2-digit",
                minute: "2-digit",
              })}{" "}
              갱신
            </span>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs"
            onClick={() => void refresh()}
            disabled={loading}
          >
            새로고침
          </Button>
        </div>
      </div>

      {error && (
        <p className="text-sm text-destructive">
          브리핑 데이터를 불러오지 못했습니다. 목데이터를 표시합니다.
        </p>
      )}

      {briefingSource === "mock" && !loading && !llmProvider && (
        <p className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
          AI 브리핑을 사용하려면{" "}
          <code className="text-xs">.env.local</code>에 무료 API 키를 설정하고
          dev 서버를 재시작하세요. Groq(
          <code className="text-xs">GROQ_API_KEY</code>) 추천.
        </p>
      )}

      {briefingSource === "mock" && !loading && llmProvider && llmError && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm">
          <p className="text-destructive">
            AI 연결 실패 ({PROVIDER_LABEL[llmProvider]}): {llmError}
          </p>
          <Button size="sm" variant="outline" onClick={() => void refresh()}>
            다시 시도
          </Button>
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="h-64 animate-pulse rounded-xl bg-muted" />
          <div className="h-64 animate-pulse rounded-xl bg-muted" />
        </div>
      ) : (
        <UsMarketSummary indices={usIndices} issues={overnightIssues} />
      )}

      {!loading && <ThemeMapper forecasts={themeForecasts} />}
    </section>
  );
}
