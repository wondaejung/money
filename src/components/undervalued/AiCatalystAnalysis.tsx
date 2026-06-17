"use client";

import { useMemo } from "react";
import { CalendarClock, Lightbulb, Sparkles, TrendingUp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScoreProgress } from "@/components/undervalued/ScoreProgress";
import { useUndervaluedStore } from "@/store/undervalued-store";

export function AiCatalystAnalysis() {
  const picks = useUndervaluedStore((state) => state.picks);
  const selectedId = useUndervaluedStore((state) => state.selectedId);
  const selectedPick = useMemo(
    () => picks.find((pick) => pick.id === selectedId) ?? null,
    [picks, selectedId],
  );

  if (!selectedPick) {
    return (
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold">AI 심층 분석</h2>
          <p className="text-sm text-muted-foreground">
            종목을 선택하면 저평가 사유와 반등 촉매제를 분석합니다.
          </p>
        </div>
        <div className="rounded-xl border border-dashed px-4 py-12 text-center text-sm text-muted-foreground">
          상단 카드에서 종목을 선택해 주세요.
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="size-5 text-violet-600" />
        <div>
          <h2 className="text-xl font-semibold">AI 심층 분석</h2>
          <p className="text-sm text-muted-foreground">
            왜 저평가인가? &amp; 언제 강세를 보일까?
          </p>
        </div>
      </div>

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
              </div>
              <CardTitle className="text-lg">
                {selectedPick.name}{" "}
                <span className="font-mono text-base font-normal text-muted-foreground">
                  {selectedPick.ticker}
                </span>
              </CardTitle>
              <CardDescription className="mt-1">
                밸류 트랩 가능성을 AI가 검토한 심층 리포트
              </CardDescription>
            </div>
            <div className="w-full min-w-[140px] sm:w-48">
              <ScoreProgress score={selectedPick.undervaluedScore} />
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="rounded-xl border bg-muted/40 p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-violet-700">
              <Lightbulb className="size-4" />
              저평가 사유 (Why)
            </div>
            <p className="text-sm leading-relaxed text-foreground/90">
              {selectedPick.reason}
            </p>
          </div>

          <div className="rounded-xl border bg-muted/40 p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-emerald-700">
              <TrendingUp className="size-4" />
              강세 전환 촉매제 (Catalyst)
            </div>
            <p className="text-sm leading-relaxed text-foreground/90">
              {selectedPick.catalyst}
            </p>
          </div>

          <div className="rounded-xl border bg-muted/40 p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-amber-700">
              <CalendarClock className="size-4" />
              예상 타이밍 (When)
            </div>
            <p className="text-sm leading-relaxed text-foreground/90">
              {selectedPick.expectedTimeline}
            </p>
          </div>

          <p className="text-xs text-muted-foreground">
            * Mock AI 분석 데이터입니다. 실제 투자 판단 전 재무제표·공시를
            반드시 확인하세요.
          </p>
        </CardContent>
      </Card>
    </section>
  );
}
