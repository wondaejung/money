"use client";

import { useMemo } from "react";
import {
  AlertTriangle,
  CalendarClock,
  FileText,
  Lightbulb,
  Loader2,
  RefreshCw,
  Sparkles,
  TrendingUp,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScoreProgress } from "@/components/undervalued/ScoreProgress";
import { useUndervaluedAnalysis } from "@/hooks/use-undervalued-analysis";
import {
  getAllStoredPicks,
  useUndervaluedStore,
} from "@/store/undervalued-store";
import type { AnalysisSignal, ValueTrapRisk } from "@/types/undervalued-analysis";

const SIGNAL_STYLES: Record<AnalysisSignal, string> = {
  positive: "border-red-500/30 bg-red-500/5 text-red-600",
  negative: "border-blue-500/30 bg-blue-500/5 text-blue-600",
  neutral: "border-border bg-muted/40 text-muted-foreground",
};

const RISK_LABELS: Record<ValueTrapRisk, string> = {
  low: "낮음",
  medium: "보통",
  high: "높음",
};

const RISK_STYLES: Record<ValueTrapRisk, string> = {
  low: "border-emerald-500/30 bg-emerald-500/5 text-emerald-700",
  medium: "border-amber-500/30 bg-amber-500/5 text-amber-700",
  high: "border-rose-500/30 bg-rose-500/5 text-rose-700",
};

function SignalBadge({ signal }: { signal: AnalysisSignal }) {
  const label =
    signal === "positive" ? "개선" : signal === "negative" ? "악화" : "중립";
  return (
    <Badge variant="outline" className={SIGNAL_STYLES[signal]}>
      {label}
    </Badge>
  );
}

export function AiCatalystAnalysis() {
  const selectedId = useUndervaluedStore((state) => state.selectedId);
  const picksByTheme = useUndervaluedStore((state) => state.picksByTheme);
  const selectedPick = useMemo(
    () =>
      getAllStoredPicks(picksByTheme).find((pick) => pick.id === selectedId) ??
      null,
    [picksByTheme, selectedId],
  );

  const { analysis, loading, error, llmAvailable, cached, refresh } =
    useUndervaluedAnalysis(selectedPick);

  if (!selectedPick) {
    return (
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold">AI 심층 분석</h2>
          <p className="text-sm text-muted-foreground">
            종목을 선택하면 재무제표·공시 기반 저평가 사유와 반등 촉매제를
            분석합니다.
          </p>
        </div>
        <div className="rounded-xl border border-dashed px-4 py-12 text-center text-sm text-muted-foreground">
          상단 카드에서 종목을 선택해 주세요.
        </div>
      </section>
    );
  }

  const display = analysis ?? {
    reason: selectedPick.reason,
    catalyst: selectedPick.catalyst,
    expectedTimeline: selectedPick.expectedTimeline,
    valueTrapRisk: "medium" as const,
    financialHighlights: [],
    disclosureNotes: [],
    keyWatchpoints: [],
    source: "rule" as const,
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="size-5 text-violet-600" />
          <div>
            <h2 className="text-xl font-semibold">AI 심층 분석</h2>
            <p className="text-sm text-muted-foreground">
              재무제표·DART 공시를 바탕으로 저평가·밸류 트랩·촉매를 판단합니다.
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={refresh}
          disabled={loading}
          className="shrink-0"
        >
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <RefreshCw className="size-4" />
          )}
          재분석
        </Button>
      </div>

      {error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <Card className="overflow-hidden border-border/80">
        <div className="h-1 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-emerald-500" />
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{selectedPick.themeLabel}</Badge>
                <Badge
                  variant="outline"
                  className={
                    selectedPick.market === "KR"
                      ? "border-red-500/30 text-red-400"
                      : "border-emerald-500/30 text-emerald-400"
                  }
                >
                  {selectedPick.market}
                </Badge>
                {analysis ? (
                  <Badge
                    variant="outline"
                    className={RISK_STYLES[analysis.valueTrapRisk]}
                  >
                    밸류 트랩 {RISK_LABELS[analysis.valueTrapRisk]}
                  </Badge>
                ) : null}
              </div>
              <CardTitle className="text-lg">
                {selectedPick.name}{" "}
                <span className="font-mono text-base font-normal text-muted-foreground">
                  {selectedPick.ticker}
                </span>
              </CardTitle>
              <CardDescription className="mt-1">
                {loading
                  ? "네이버 재무제표·공시를 수집하고 분석 중..."
                  : analysis?.source === "llm"
                    ? "재무·공시 기반 AI 심층 리포트"
                    : "재무·공시 기반 규칙 분석 리포트"}
                {cached ? " · 캐시" : ""}
              </CardDescription>
            </div>
            <div className="w-full min-w-[140px] sm:w-48">
              <ScoreProgress score={selectedPick.undervaluedScore} />
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {loading && !analysis ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              재무제표·공시 데이터 분석 중...
            </div>
          ) : (
            <>
              {display.financialHighlights.length > 0 ? (
                <div className="rounded-xl border bg-muted/40 p-4">
                  <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
                    <FileText className="size-4 text-violet-600" />
                    재무제표 핵심 지표
                  </div>
                  <div className="space-y-2">
                    {display.financialHighlights.map((item) => (
                      <div
                        key={item.label}
                        className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-border/60 bg-background/60 px-3 py-2"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">{item.label}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.detail}
                          </p>
                        </div>
                        <SignalBadge signal={item.signal} />
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {display.disclosureNotes.length > 0 ? (
                <div className="rounded-xl border bg-muted/40 p-4">
                  <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
                    <AlertTriangle className="size-4 text-amber-600" />
                    주요 공시 이벤트
                  </div>
                  <div className="space-y-2">
                    {display.disclosureNotes.map((note) => (
                      <div
                        key={`${note.date}-${note.title}`}
                        className="rounded-lg border border-border/60 bg-background/60 px-3 py-2"
                      >
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {note.date}
                          </span>
                          <Badge variant="outline" className="text-[10px]">
                            {note.impact}
                          </Badge>
                        </div>
                        <p className="text-sm leading-relaxed">{note.title}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="rounded-xl border bg-muted/40 p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium text-violet-700">
                  <Lightbulb className="size-4" />
                  저평가 사유 (Why)
                </div>
                <p className="text-sm leading-relaxed text-foreground/90">
                  {display.reason}
                </p>
              </div>

              <div className="rounded-xl border bg-muted/40 p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium text-emerald-700">
                  <TrendingUp className="size-4" />
                  강세 전환 촉매제 (Catalyst)
                </div>
                <p className="text-sm leading-relaxed text-foreground/90">
                  {display.catalyst}
                </p>
              </div>

              <div className="rounded-xl border bg-muted/40 p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium text-amber-700">
                  <CalendarClock className="size-4" />
                  예상 타이밍 (When)
                </div>
                <p className="text-sm leading-relaxed text-foreground/90">
                  {display.expectedTimeline}
                </p>
              </div>

              {display.keyWatchpoints.length > 0 ? (
                <div className="rounded-xl border bg-muted/40 p-4">
                  <p className="mb-2 text-sm font-medium">체크포인트</p>
                  <ul className="list-inside list-disc space-y-1 text-sm text-foreground/90">
                    {display.keyWatchpoints.map((point) => (
                      <li key={point}>{point}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </>
          )}

          <p className="text-xs text-muted-foreground">
            * 네이버 증권 분기·연간 재무제표와 DART 공시를 수집해 분석합니다.
            {llmAvailable
              ? " Vercel 등 프로덕션 환경에서는 LLM이 심층 해석을 보강합니다."
              : " LLM 미설정 시 재무·공시 규칙 기반 분석이 제공됩니다."}{" "}
            투자 판단 전 반드시 원 공시를 확인하세요.
          </p>
        </CardContent>
      </Card>
    </section>
  );
}
