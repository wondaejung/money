"use client";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { LiveHolding } from "@/types/portfolio";

interface LossHoldingsSummaryProps {
  holdings: LiveHolding[];
}

function formatKrw(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 100_000_000) {
    return `${(abs / 100_000_000).toFixed(2)}억원`;
  }
  if (abs >= 10_000) {
    return `${Math.round(abs / 10_000).toLocaleString()}만원`;
  }
  return `${Math.round(abs).toLocaleString()}원`;
}

export function LossHoldingsSummary({ holdings }: LossHoldingsSummaryProps) {
  const losingHoldings = holdings
    .filter((holding) => holding.gainAfterTaxKrw < 0)
    .sort((a, b) => a.gainAfterTaxKrw - b.gainAfterTaxKrw);

  if (losingHoldings.length === 0) {
    return null;
  }

  const totalLossKrw = losingHoldings.reduce(
    (sum, holding) => sum + holding.gainAfterTaxKrw,
    0,
  );

  return (
    <Card className="border-blue-200/80 bg-blue-50/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">손실 종목 요약</CardTitle>
        <CardDescription>
          세후·수수료 반영 기준, 현재 마이너스인 종목만 모았습니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border border-blue-200/60 bg-background px-4 py-3">
          <p className="text-xs text-muted-foreground">총 손실 금액 (원화)</p>
          <p className="text-2xl font-bold text-blue-600">
            -{formatKrw(totalLossKrw)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            손실 종목 {losingHoldings.length}개
          </p>
        </div>

        <ul className="space-y-2">
          {losingHoldings.map((holding) => (
            <li
              key={holding.id}
              className="flex items-center justify-between gap-3 rounded-lg border bg-background px-3 py-2.5"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className="truncate font-medium">{holding.name}</p>
                  <Badge variant="outline" className="text-[10px]">
                    {holding.market}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{holding.symbol}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-mono text-sm font-semibold text-blue-600">
                  -{formatKrw(holding.gainAfterTaxKrw)}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  세후·수수료 · 평가 {formatKrw(holding.valueKrw)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
