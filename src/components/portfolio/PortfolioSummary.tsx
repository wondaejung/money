"use client";

import { ArrowDownRight, ArrowUpRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { formatKrw } from "@/lib/format-money";
import { cn } from "@/lib/utils";
import type { LiveHolding } from "@/types/portfolio";

interface PortfolioSummaryProps {
  holdings: LiveHolding[];
  hydrated: boolean;
  usdToKrw: number;
  fxSource?: "naver" | "fallback";
  fxValid?: boolean;
}

export function PortfolioSummary({
  holdings,
  hydrated,
  usdToKrw,
  fxSource,
  fxValid,
}: PortfolioSummaryProps) {
  if (!hydrated) {
    return <div className="h-32 animate-pulse rounded-xl bg-muted" />;
  }

  if (holdings.length === 0) {
    return null;
  }

  const totalValueKrw = holdings.reduce((sum, h) => sum + h.valueKrw, 0);
  const totalGainAfterTaxKrw = holdings.reduce(
    (sum, h) => sum + h.gainAfterTaxKrw,
    0,
  );
  const totalCostKrw = totalValueKrw - holdings.reduce((sum, h) => sum + h.gainAmountKrw, 0);
  const totalGainPercent =
    totalCostKrw > 0 ? (totalGainAfterTaxKrw / totalCostKrw) * 100 : 0;
  const totalTaxAndCommissionKrw = holdings.reduce(
    (sum, h) => sum + h.estimatedTaxKrw + h.totalCommissionKrw,
    0,
  );
  const todayChangeKrw = holdings.reduce((sum, h) => {
    const denominator = 100 + h.changePercent;
    if (denominator === 0) return sum;
    return sum + (h.valueKrw * h.changePercent) / denominator;
  }, 0);
  const upCount = holdings.filter((h) => h.changePercent > 0).length;
  const downCount = holdings.filter((h) => h.changePercent < 0).length;

  const gainPositive = totalGainAfterTaxKrw >= 0;
  const todayPositive = todayChangeKrw >= 0;

  return (
    <section className="rounded-xl border bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs text-muted-foreground sm:text-sm">
            총 평가금액
          </p>
          <p className="text-3xl font-bold tracking-tight sm:text-4xl">
            {formatKrw(totalValueKrw)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground sm:text-sm">
            세후·수수료 손익
          </p>
          <p
            className={cn(
              "flex items-center justify-end gap-1 text-xl font-bold sm:text-2xl",
              gainPositive ? "text-red-500" : "text-blue-500",
            )}
          >
            {gainPositive ? (
              <ArrowUpRight className="h-5 w-5" aria-hidden />
            ) : (
              <ArrowDownRight className="h-5 w-5" aria-hidden />
            )}
            {gainPositive ? "+" : "-"}
            {formatKrw(Math.abs(totalGainAfterTaxKrw))}
            <span className="text-sm font-medium">
              ({gainPositive ? "+" : ""}
              {totalGainPercent.toFixed(1)}%)
            </span>
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-2.5 sm:grid-cols-3">
        <div className="rounded-lg border bg-background px-3 py-2.5">
          <p className="text-xs text-muted-foreground">오늘 변동</p>
          <p
            className={cn(
              "text-base font-semibold",
              todayPositive ? "text-red-500" : "text-blue-500",
            )}
          >
            {todayPositive ? "+" : "-"}
            {formatKrw(Math.abs(todayChangeKrw))}
          </p>
        </div>
        <div className="rounded-lg border bg-background px-3 py-2.5">
          <p className="text-xs text-muted-foreground">상승 / 하락</p>
          <p className="text-base font-semibold">
            <span className="text-red-500">{upCount}</span>
            <span className="mx-1 text-muted-foreground">/</span>
            <span className="text-blue-500">{downCount}</span>
          </p>
        </div>
        <div className="rounded-lg border bg-background px-3 py-2.5">
          <p className="text-xs text-muted-foreground">예상 세금·수수료</p>
          <p className="text-base font-semibold">
            {formatKrw(totalTaxAndCommissionKrw)}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Badge variant={fxValid ? "secondary" : "destructive"}>
          USD/KRW{" "}
          {usdToKrw.toLocaleString(undefined, { maximumFractionDigits: 2 })}원
          {fxSource === "naver" ? " (네이버)" : " (기본값)"}
        </Badge>
        <span className="text-xs text-muted-foreground">
          토스증권 수수료 0.015% · 증권거래세 0.15% · 대주주(10억↑) 양도세 22%
        </span>
      </div>
    </section>
  );
}
