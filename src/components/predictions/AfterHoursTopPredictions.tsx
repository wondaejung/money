"use client";

import { Clock, RefreshCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useClosingBellSnapshot } from "@/hooks/use-closing-bell";
import { formatKstDateTime } from "@/lib/kr-market-time";
import type { AfterHoursPick } from "@/types/prediction";

function formatKrw(value: number): string {
  return `${value.toLocaleString()}원`;
}

function formatPercent(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

function PickCard({ pick, rank }: { pick: AfterHoursPick; rank: number }) {
  const isAfterHoursUp = pick.afterHoursChangePercent >= 0;

  return (
    <Card className="border-border/80">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <Badge variant="default">TOP {rank}</Badge>
              <Badge variant="outline">{pick.sector}</Badge>
            </div>
            <CardTitle className="text-base">
              {pick.name}{" "}
              <span className="font-normal text-muted-foreground">
                {pick.symbol}
              </span>
            </CardTitle>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">상승 확률</p>
            <p className="text-2xl font-bold text-red-500">
              {pick.riseProbability}%
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg border bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">정규장 종가</p>
            <p className="font-mono font-medium">
              {formatKrw(pick.regularClosePrice)}
            </p>
          </div>
          <div className="rounded-lg border bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">시간외 최종가</p>
            <p className="font-mono font-medium">
              {formatKrw(pick.afterHoursClosePrice)}
            </p>
            <p
              className={`text-xs font-medium ${isAfterHoursUp ? "text-red-500" : "text-blue-500"}`}
            >
              {formatPercent(pick.afterHoursChangePercent)}
            </p>
          </div>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {pick.reason}
        </p>
      </CardContent>
    </Card>
  );
}

export function AfterHoursTopPredictions() {
  const { data, loading, error, providerLabel, refresh } =
    useClosingBellSnapshot();

  const snapshot = data?.snapshot;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">
            시간외 마감 기반 다음 거래일 TOP 3
          </h2>
          <p className="text-sm text-muted-foreground">
            네이버 금융 시간외 시세 + AI가 다음 거래일 오전 9시 개장 강세
            종목을 추천합니다.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">네이버 금융</Badge>
          <Badge
            variant={data?.predictionSource === "llm" ? "default" : "outline"}
          >
            {data?.predictionSource === "llm"
              ? `AI 예측${providerLabel ? ` · ${providerLabel}` : ""}`
              : "규칙 기반 예측"}
          </Badge>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 gap-1 px-2 text-xs"
            onClick={() => void refresh()}
            disabled={loading}
          >
            <RefreshCw className="size-3" />
            새로고침
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {data?.llmError && data.predictionSource === "rule" && (
        <p className="text-sm text-amber-600">
          AI 예측 실패 — 규칙 기반으로 표시 중 ({data.llmError})
        </p>
      )}

      {loading && !snapshot ? (
        <div className="grid gap-4 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-56 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : snapshot ? (
        <>
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardHeader className="pb-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-base">시간외 마감 요약</CardTitle>
                <Badge variant="secondary" className="gap-1">
                  <Clock className="size-3" />
                  마감{" "}
                  {formatKstDateTime(new Date(snapshot.krAfterHoursClosedAt))}
                </Badge>
              </div>
              <CardDescription className="text-sm leading-relaxed text-foreground/80">
                {snapshot.marketSummary}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-xs text-muted-foreground">
                검증 대상 거래일: {snapshot.targetTradingDate} (09:00 개장)
              </p>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-3">
            {snapshot.picks.map((pick, index) => (
              <PickCard key={pick.symbol} pick={pick} rank={index + 1} />
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}
