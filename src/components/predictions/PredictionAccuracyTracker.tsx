"use client";

import { useEffect } from "react";
import { Pin } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatKstDateTime, isRegularSessionClosed } from "@/lib/kr-market-time";
import {
  getVerifiablePredictions,
  usePredictionStore,
} from "@/store/prediction-store";
import type {
  ClosingBellPrediction,
  PredictionOutcome,
  PredictionVerification,
  VerifyPredictionsApiResponse,
} from "@/types/prediction";

const OUTCOME_LABEL: Record<PredictionOutcome, string> = {
  success: "성공",
  failure: "실패",
  pending: "검증 대기",
};

const OUTCOME_VARIANT: Record<
  PredictionOutcome,
  "default" | "destructive" | "secondary"
> = {
  success: "default",
  failure: "destructive",
  pending: "secondary",
};

function formatKrw(value: number | null): string {
  if (value === null) return "—";
  return `${Math.round(value).toLocaleString()}원`;
}

function formatGain(value: number | null): string {
  if (value === null) return "—";
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

function VerificationRow({ verification }: { verification: PredictionVerification }) {
  return (
    <TableRow>
      <TableCell>
        <p className="font-medium">{verification.name}</p>
        <p className="text-xs text-muted-foreground">{verification.symbol}</p>
      </TableCell>
      <TableCell className="font-mono text-sm">
        {formatKrw(verification.baselinePrice)}
        <p className="text-[10px] text-muted-foreground">
          {verification.baselineType === "after_hours_close"
            ? "시간외 종가"
            : "정규장 종가"}
        </p>
      </TableCell>
      <TableCell className="font-mono text-sm">
        {formatKrw(verification.nextDayOpen)}
      </TableCell>
      <TableCell className="font-mono text-sm">
        {formatKrw(verification.nextDayHigh)}
      </TableCell>
      <TableCell
        className={`font-mono text-sm font-medium ${
          (verification.maxGainPercent ?? 0) >= 0
            ? "text-red-500"
            : "text-blue-500"
        }`}
      >
        {formatGain(verification.maxGainPercent)}
      </TableCell>
      <TableCell>
        <Badge variant={OUTCOME_VARIANT[verification.outcome]}>
          {OUTCOME_LABEL[verification.outcome]}
        </Badge>
      </TableCell>
    </TableRow>
  );
}

function PredictionSessionCard({
  prediction,
  onArchive,
}: {
  prediction: ClosingBellPrediction;
  onArchive: (id: string) => void;
}) {
  const successCount = prediction.verifications.filter(
    (v) => v.outcome === "success",
  ).length;
  const verified = prediction.verifications.every(
    (v) => v.outcome !== "pending",
  );

  return (
    <Card className="border-border/80">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">
              {prediction.targetTradingDate} 거래일 검증
            </CardTitle>
            <CardDescription>
              예측 시점:{" "}
              {formatKstDateTime(new Date(prediction.krAfterHoursClosedAt))}{" "}
              (18:00 시간외 마감)
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {verified && (
              <Badge variant="outline">
                적중 {successCount}/{prediction.verifications.length}
              </Badge>
            )}
            {prediction.isArchived && (
              <Badge variant="secondary">보관됨</Badge>
            )}
            {!prediction.isArchived && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1"
                onClick={() => onArchive(prediction.id)}
              >
                <Pin className="size-3" />
                기록 보관하기
              </Button>
            )}
          </div>
        </div>
        <p className="text-sm text-muted-foreground">{prediction.marketSummary}</p>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>종목</TableHead>
              <TableHead>기준가</TableHead>
              <TableHead>익일 시가</TableHead>
              <TableHead>익일 고가</TableHead>
              <TableHead>최대 수익률</TableHead>
              <TableHead>결과</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {prediction.verifications.map((verification) => (
              <VerificationRow
                key={`${prediction.id}-${verification.symbol}`}
                verification={verification}
              />
            ))}
          </TableBody>
        </Table>
        {prediction.nextDayMarketClosedAt && (
          <p className="mt-3 text-xs text-muted-foreground">
            검증 완료 (네이버 금융):{" "}
            {formatKstDateTime(new Date(prediction.nextDayMarketClosedAt))}{" "}
            · 15:30 정규장 마감 기준
          </p>
        )}
      </CardContent>
    </Card>
  );
}

async function verifyPendingPredictions() {
  const { predictions, applyVerification } = usePredictionStore.getState();
  const now = new Date();
  const pending = predictions.filter(
    (prediction) =>
      !prediction.nextDayMarketClosedAt &&
      isRegularSessionClosed(prediction.targetTradingDate, now),
  );

  for (const prediction of pending) {
    try {
      const response = await fetch("/api/predictions/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetTradingDate: prediction.targetTradingDate,
          verifications: prediction.verifications.map((verification) => ({
            symbol: verification.symbol,
            name: verification.name,
            baselinePrice: verification.baselinePrice,
            baselineType: verification.baselineType,
          })),
        }),
        cache: "no-store",
      });

      if (!response.ok) continue;

      const result = (await response.json()) as VerifyPredictionsApiResponse;
      applyVerification(prediction.id, result);
    } catch {
      // 다음 주기에 재시도
    }
  }
}

export function PredictionAccuracyTracker() {
  const predictions = usePredictionStore((state) => state.predictions);
  const initialized = usePredictionStore((state) => state.initialized);
  const archivePrediction = usePredictionStore((state) => state.archivePrediction);

  useEffect(() => {
    const { initialize, purgeExpired } = usePredictionStore.getState();
    initialize();
    purgeExpired();
    void verifyPendingPredictions();

    const timer = window.setInterval(() => {
      usePredictionStore.getState().purgeExpired();
      void verifyPendingPredictions();
    }, 60_000);

    return () => window.clearInterval(timer);
  }, []);

  const sessions = getVerifiablePredictions(predictions);

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">적중률 검증 대시보드</h2>
        <p className="text-sm text-muted-foreground">
          어제 18시 추천 종목이 다음 거래일(09:00~15:30) 시가·고가 기준으로
          상승했는지 네이버 금융 일봉으로 검증합니다.
        </p>
      </div>

      {!initialized ? (
        <div className="h-48 animate-pulse rounded-xl bg-muted" />
      ) : sessions.length === 0 ? (
        <div className="rounded-lg border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
          검증할 예측 기록이 없습니다. 상단 TOP 3 예측이 생성되면 자동으로
          저장됩니다.
        </div>
      ) : (
        <div className="space-y-4">
          {sessions.map((prediction) => (
            <PredictionSessionCard
              key={prediction.id}
              prediction={prediction}
              onArchive={archivePrediction}
            />
          ))}
        </div>
      )}
    </section>
  );
}
