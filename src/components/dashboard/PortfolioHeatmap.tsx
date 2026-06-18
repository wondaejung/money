"use client";

import { useEffect, useState } from "react";
import { ResponsiveContainer, Treemap } from "recharts";

import Link from "next/link";

import { TreemapCell } from "@/components/dashboard/TreemapCell";
import { PortfolioHeatmapMobile } from "@/components/dashboard/PortfolioHeatmapMobile";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { usePortfolio } from "@/hooks/use-portfolio";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { usePortfolioHydrated } from "@/hooks/use-portfolio-hydrated";
import {
  formatChangePercent,
  getChangeTextClass,
} from "@/lib/market-colors";
import { buildTreemapData, getPortfolioTaxSummary } from "@/lib/portfolio";
import { useMarketStore } from "@/store/market-store";
import { usePortfolioStore } from "@/store/portfolio-store";

function formatKrw(value: number): string {
  if (value >= 100_000_000) {
    return `${(value / 100_000_000).toFixed(1)}억원`;
  }

  if (value >= 10_000) {
    return `${Math.round(value / 10_000).toLocaleString()}만원`;
  }

  return `${value.toLocaleString()}원`;
}

function formatFetchedAt(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function PortfolioHeatmap() {
  const [chartReady, setChartReady] = useState(false);
  const isMobile = useIsMobile();
  const marketFilter = useMarketStore((state) => state.marketFilter);
  const hydrated = usePortfolioHydrated();
  const positions = usePortfolioStore((state) => state.positions);
  const { holdings, usdToKrw, fxSource, fxValid, fetchedAt, loading, error, refresh } =
    usePortfolio();

  useEffect(() => {
    setChartReady(true);
  }, []);

  const treemapData = buildTreemapData(holdings, marketFilter);
  const summary = getPortfolioTaxSummary(holdings, marketFilter);
  const summaryMarket = "KR";

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>포트폴리오 히트맵</CardTitle>
            <CardDescription>
              타일 크기 = 보유 비중 · 색상 = 세후·수수료 반영 전체 손익률
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">네이버 금융 실시간</Badge>
            <Badge variant={fxValid !== false ? "outline" : "destructive"}>
              1 USD = {usdToKrw.toLocaleString(undefined, { maximumFractionDigits: 2 })}원
              {fxSource === "naver"
                ? " (네이버)"
                : fxSource === "yahoo"
                  ? ""
                  : " (기본값)"}
            </Badge>
            {fetchedAt && (
              <span className="text-xs text-muted-foreground">
                {formatFetchedAt(fetchedAt)} 갱신
              </span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm">
            <p className="text-destructive">{error}</p>
            <Button size="sm" variant="outline" onClick={() => void refresh()}>
              다시 시도
            </Button>
          </div>
        )}

        {loading && holdings.length === 0 && positions.length === 0 ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="h-16 animate-pulse rounded-lg bg-muted"
                />
              ))}
            </div>
            <div className="h-[360px] animate-pulse rounded-lg bg-muted" />
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-end justify-between gap-3 sm:gap-4">
              <div className="min-w-[45%]">
                <p className="text-sm text-muted-foreground">총 평가금액</p>
                <p className="text-xl font-semibold sm:text-2xl">
                  {formatKrw(summary.totalValueKrw)}
                </p>
              </div>
              <div className="min-w-[45%] text-right">
                <p className="text-sm text-muted-foreground">세후·수수료 총 손익</p>
                <p
                  className={`text-xl font-semibold sm:text-2xl ${getChangeTextClass(summaryMarket, summary.totalGainAfterTaxKrw)}`}
                >
                  {summary.totalGainAfterTaxKrw >= 0 ? "+" : ""}
                  {formatKrw(summary.totalGainAfterTaxKrw)}
                </p>
                <p className="text-xs text-muted-foreground">
                  세전 {summary.totalGainPreTaxKrw >= 0 ? "+" : ""}
                  {formatKrw(summary.totalGainPreTaxKrw)}
                </p>
              </div>
              <div className="min-w-[45%] text-right sm:text-left">
                <p className="text-sm text-muted-foreground">예상 세금·수수료</p>
                <p className="text-lg font-semibold sm:text-xl">
                  {formatKrw(summary.totalTaxKrw + summary.totalCommissionKrw)}
                </p>
              </div>
              <div className="min-w-[45%] text-right">
                <p className="text-sm text-muted-foreground">가중 평균 수익률</p>
                <p
                  className={`text-lg font-semibold sm:text-xl ${getChangeTextClass(summaryMarket, summary.weightedGainPercent)}`}
                >
                  {formatChangePercent(summary.weightedGainPercent)}
                </p>
              </div>
              <div className="min-w-[45%] text-right sm:text-left">
                <p className="text-sm text-muted-foreground">보유 종목</p>
                <p className="text-lg font-semibold sm:text-xl">{summary.count}개</p>
              </div>
            </div>

            {isMobile ? (
              <PortfolioHeatmapMobile
                data={treemapData}
                totalValueKrw={summary.totalValueKrw}
                positionsCount={positions.length}
                hydrated={hydrated}
              />
            ) : (
            <div className="h-[360px] w-full min-w-0">
              {treemapData.length > 0 && chartReady ? (
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <Treemap
                    data={treemapData}
                    dataKey="size"
                    aspectRatio={4 / 3}
                    stroke="var(--background)"
                    content={<TreemapCell />}
                    isAnimationActive={false}
                  />
                </ResponsiveContainer>
              ) : treemapData.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 rounded-lg border border-dashed text-center">
                  <p className="text-sm text-muted-foreground">
                    {hydrated && positions.length > 0
                      ? `저장된 종목 ${positions.length}개 — 시세를 불러오는 중입니다…`
                      : "등록된 종목이 없습니다."}
                  </p>
                  {positions.length === 0 && (
                    <Link
                      href="/portfolio"
                      className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border bg-background px-4 text-sm font-medium hover:bg-muted"
                    >
                      내 포트폴리오에서 종목 추가
                    </Link>
                  )}
                </div>
              ) : (
                <div className="h-full animate-pulse rounded-lg bg-muted" />
              )}
            </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
