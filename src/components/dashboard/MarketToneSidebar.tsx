"use client";

import Link from "next/link";
import { RefreshCw, ScanSearch, TrendingUp } from "lucide-react";

import { SentimentGauge } from "@/components/dashboard/SentimentGauge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useMarketTone } from "@/hooks/use-market-tone";
import { formatTradingValueShort } from "@/lib/market-tone";
import type { AfterHoursFeatureBadge } from "@/types/market-tone";

const BADGE_LABEL: Record<AfterHoursFeatureBadge, string> = {
  change_leader: "등락률 TOP",
  volume_leader: "거래대금 TOP",
  momentum: "시간외 모멘텀",
};

function formatPercent(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

function formatKrw(value: number): string {
  return `${Math.round(value).toLocaleString()}원`;
}

export function MarketToneSidebar() {
  const { data, loading, error, refresh } = useMarketTone();

  return (
    <Card className="border-border/80">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ScanSearch className="size-4 text-muted-foreground" />
              <CardTitle className="text-base">
                Market Tone & Scanner
              </CardTitle>
            </div>
            <CardDescription>
              시장 센티멘트 & 시간외 특징주
            </CardDescription>
          </div>
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={() => void refresh()}
            disabled={loading}
            aria-label="새로고침"
          >
            <RefreshCw className={loading ? "size-4 animate-spin" : "size-4"} />
          </Button>
        </div>
        {data && (
          <p className="text-xs text-muted-foreground">
            {data.closedAtLabel} · {data.sessionDate}
          </p>
        )}
      </CardHeader>

      <CardContent className="space-y-5">
        {loading && !data ? (
          <div className="space-y-4">
            <div className="h-24 animate-pulse rounded-lg bg-muted" />
            <div className="h-32 animate-pulse rounded-lg bg-muted" />
          </div>
        ) : error ? (
          <div className="rounded-lg border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
            {error}
          </div>
        ) : data ? (
          <>
            <SentimentGauge
              score={data.sentiment.score}
              level={data.sentiment.level}
              label={data.sentiment.label}
            />

            <p className="text-xs leading-relaxed text-muted-foreground">
              {data.sentiment.summary}
            </p>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-md bg-muted/60 px-2.5 py-2">
                <p className="text-muted-foreground">코스피</p>
                <p
                  className={
                    data.sentiment.kospiChangePercent >= 0
                      ? "font-medium text-red-500"
                      : "font-medium text-blue-500"
                  }
                >
                  {formatPercent(data.sentiment.kospiChangePercent)}
                </p>
              </div>
              <div className="rounded-md bg-muted/60 px-2.5 py-2">
                <p className="text-muted-foreground">시간외 상승</p>
                <p className="font-medium">
                  {data.sentiment.advancingRatio}%
                </p>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="size-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold">시간외 특징주 TOP 3</h3>
              </div>

              {data.featuredStocks.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  시간외 거래가 활발한 종목이 없습니다.
                </p>
              ) : (
                <ul className="space-y-3">
                  {data.featuredStocks.map((stock) => {
                    const isUp = stock.afterHoursChangePercent >= 0;

                    return (
                      <li
                        key={stock.symbol}
                        className="rounded-lg border border-border/70 p-3"
                      >
                        <div className="mb-2 flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {stock.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {stock.symbol}
                            </p>
                          </div>
                          <Badge variant="outline">#{stock.rank}</Badge>
                        </div>

                        <div className="mb-2 flex flex-wrap gap-1">
                          {stock.badges.map((badge) => (
                            <Badge key={badge} variant="secondary" className="text-[10px]">
                              {BADGE_LABEL[badge]}
                            </Badge>
                          ))}
                        </div>

                        <div className="flex items-end justify-between gap-2 text-xs">
                          <div>
                            <p className="text-muted-foreground">시간외 종가</p>
                            <p className="font-mono font-medium">
                              {formatKrw(stock.afterHoursClosePrice)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-muted-foreground">등락률</p>
                            <p
                              className={
                                isUp
                                  ? "font-mono font-semibold text-red-500"
                                  : "font-mono font-semibold text-blue-500"
                              }
                            >
                              {formatPercent(stock.afterHoursChangePercent)}
                            </p>
                          </div>
                        </div>

                        <p className="mt-2 text-[11px] text-muted-foreground">
                          거래대금{" "}
                          {stock.tradingValueKrw > 0
                            ? formatTradingValueShort(stock.tradingValueKrw)
                            : stock.tradingValueLabel}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <Link
              href="/predictions"
              className="inline-flex h-8 w-full items-center justify-center rounded-lg border border-border bg-background px-3 text-xs font-medium hover:bg-muted"
            >
              종가 베팅 예측 보기
            </Link>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
