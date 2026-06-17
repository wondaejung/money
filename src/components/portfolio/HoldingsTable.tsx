"use client";

import { useMemo } from "react";

import { MiniSparkline } from "@/components/portfolio/MiniSparkline";
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
import {
  formatChangePercent,
  getChangeTextClass,
} from "@/lib/market-colors";
import {
  getLiveHoldingsFromRows,
  mergePortfolioDisplayRows,
} from "@/lib/portfolio-display";
import { usePortfolioStore } from "@/store/portfolio-store";
import type { LiveHolding, UserPosition } from "@/types/portfolio";
import { cn } from "@/lib/utils";

interface HoldingsTableProps {
  positions: UserPosition[];
  holdings: LiveHolding[];
  hydrated: boolean;
  loading: boolean;
  error: string | null;
  priceFlash: Record<string, "up" | "down" | null>;
  fetchedAt: string | null;
  usdToKrw: number;
  fxSource?: "yahoo" | "fallback";
  fxValid?: boolean;
}

function formatKrw(value: number): string {
  if (Math.abs(value) >= 100_000_000) {
    return `${(value / 100_000_000).toFixed(2)}억원`;
  }
  if (Math.abs(value) >= 10_000) {
    return `${Math.round(value / 10_000).toLocaleString()}만원`;
  }
  return `${Math.round(value).toLocaleString()}원`;
}

function formatPrice(value: number, currency: string): string {
  if (currency === "KRW") {
    return `${Math.round(value).toLocaleString()}원`;
  }
  return `$${value.toFixed(2)}`;
}

export function HoldingsTable({
  positions,
  holdings,
  hydrated,
  loading,
  error,
  priceFlash,
  fetchedAt,
  usdToKrw,
  fxSource,
  fxValid,
}: HoldingsTableProps) {
  const removePosition = usePortfolioStore((state) => state.removePosition);

  const displayRows = useMemo(
    () => mergePortfolioDisplayRows(positions, holdings),
    [positions, holdings],
  );
  const liveHoldings = useMemo(
    () => getLiveHoldingsFromRows(displayRows),
    [displayRows],
  );
  const pendingCount = displayRows.filter((row) => row.kind === "pending").length;

  const totalValueKrw = liveHoldings.reduce((sum, h) => sum + h.valueKrw, 0);
  const totalGainAfterTaxKrw = liveHoldings.reduce(
    (sum, h) => sum + h.gainAfterTaxKrw,
    0,
  );
  const totalTaxKrw = liveHoldings.reduce((sum, h) => sum + h.estimatedTaxKrw, 0);
  const totalCommissionKrw = liveHoldings.reduce(
    (sum, h) => sum + h.totalCommissionKrw,
    0,
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>보유 종목</CardTitle>
            <CardDescription>
              30초마다 갱신 · 토스증권 수수료 0.015%(매수·매도) · 증권거래세
              0.15% · 대주주(10억↑) 양도세 22%
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">저장 {positions.length}종목</Badge>
            {pendingCount > 0 && (
              <Badge variant="outline">시세 로딩 {pendingCount}</Badge>
            )}
            <Badge variant={fxValid ? "secondary" : "destructive"}>
              USD/KRW {usdToKrw.toLocaleString(undefined, { maximumFractionDigits: 2 })}원
              {fxSource === "yahoo" ? " (Yahoo)" : " (기본값)"}
            </Badge>
            {fetchedAt && (
              <span className="text-xs text-muted-foreground">
                {new Date(fetchedAt).toLocaleTimeString("ko-KR", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}{" "}
                갱신
              </span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {hydrated && positions.length === 0 && (
          <p className="rounded-lg border border-dashed px-3 py-2 text-xs text-muted-foreground">
            종목은 이 브라우저에만 저장됩니다.{" "}
            <strong className="font-medium text-foreground">localhost</strong>와{" "}
            <strong className="font-medium text-foreground">127.0.0.1</strong>은
            별도 저장소이니 주소를 통일해 주세요.
          </p>
        )}

        {liveHoldings.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">총 평가금액 (원화)</p>
              <p className="text-lg font-semibold">{formatKrw(totalValueKrw)}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">
                세후·수수료 총 손익 (원화)
              </p>
              <p
                className={`text-lg font-semibold ${totalGainAfterTaxKrw >= 0 ? "text-red-500" : "text-blue-500"}`}
              >
                {totalGainAfterTaxKrw >= 0 ? "+" : ""}
                {formatKrw(totalGainAfterTaxKrw)}
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">예상 세금·수수료</p>
              <p className="text-lg font-semibold">
                {formatKrw(totalTaxKrw + totalCommissionKrw)}
              </p>
              <p className="text-[10px] text-muted-foreground">
                세금 {formatKrw(totalTaxKrw)} · 수수료{" "}
                {formatKrw(totalCommissionKrw)}
              </p>
            </div>
          </div>
        )}

        {!fxValid && (
          <p className="text-sm text-amber-600">
            환율 데이터를 가져오지 못해 기본값을 사용 중입니다. 잠시 후
            새로고침해 보세요.
          </p>
        )}

        {error && positions.length > 0 && (
          <p className="text-sm text-amber-600">
            시세 일부 로드 실패: {error} (저장된 종목은 아래에 표시됩니다)
          </p>
        )}

        {!hydrated && positions.length === 0 ? (
          <div className="h-48 animate-pulse rounded-lg bg-muted" />
        ) : displayRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            등록된 종목이 없습니다. 위에서 종목을 추가하세요.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>종목</TableHead>
                  <TableHead>당일 흐름</TableHead>
                  <TableHead className="text-right">현재가</TableHead>
                  <TableHead className="text-right">매수가</TableHead>
                  <TableHead className="text-right">수량</TableHead>
                  <TableHead className="text-right">세전 손익</TableHead>
                  <TableHead className="text-right">세금·수수료</TableHead>
                  <TableHead className="text-right">세후·수수료 손익</TableHead>
                  <TableHead className="text-right">원화 평가</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayRows.map((row) => {
                  if (row.kind === "pending") {
                    const position = row.position;
                    return (
                      <TableRow key={position.id} className="bg-muted/20">
                        <TableCell>
                          <div>
                            <p className="font-medium">{position.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {position.symbol} · {position.market}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-muted-foreground">
                            {loading ? "로딩…" : "—"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm text-muted-foreground">
                          {loading ? "시세 로딩 중" : "시세 없음"}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {formatPrice(position.purchasePrice, position.currency)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {position.shares.toLocaleString()}
                        </TableCell>
                        <TableCell colSpan={3} className="text-right text-xs text-muted-foreground">
                          실시간 손익 계산 대기
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm text-muted-foreground">
                          —
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive"
                            onClick={() => removePosition(position.id)}
                          >
                            삭제
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  }

                  const holding = row.holding;
                  return (
                    <TableRow key={holding.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{holding.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {holding.symbol} · {holding.market}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <MiniSparkline
                          data={holding.sparkline}
                          market={holding.market}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div
                          className={cn(
                            "rounded px-1 transition-colors duration-500",
                            priceFlash[holding.id] === "up" &&
                              holding.market === "KR" &&
                              "bg-red-500/20",
                            priceFlash[holding.id] === "down" &&
                              holding.market === "KR" &&
                              "bg-blue-500/20",
                            priceFlash[holding.id] === "up" &&
                              holding.market === "US" &&
                              "bg-emerald-500/20",
                            priceFlash[holding.id] === "down" &&
                              holding.market === "US" &&
                              "bg-rose-500/20",
                          )}
                        >
                          <p className="font-mono text-sm">
                            {formatPrice(holding.currentPrice, holding.currency)}
                          </p>
                          <p
                            className={`text-xs ${getChangeTextClass(holding.market, holding.changePercent)}`}
                          >
                            {formatChangePercent(holding.changePercent)}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatPrice(holding.purchasePrice, holding.currency)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {holding.shares.toLocaleString()}
                      </TableCell>
                      <TableCell
                        className={`text-right font-mono text-sm ${getChangeTextClass(holding.market, holding.gainAmount)}`}
                      >
                        {holding.gainAmount >= 0 ? "+" : ""}
                        {formatPrice(holding.gainAmount, holding.currency)}
                        <p className="text-xs text-muted-foreground">
                          {formatChangePercent(holding.gainPercent)}
                        </p>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm text-muted-foreground">
                        {formatPrice(
                          holding.estimatedTax + holding.totalCommission,
                          holding.currency,
                        )}
                      </TableCell>
                      <TableCell
                        className={`text-right font-mono text-sm font-medium ${getChangeTextClass(holding.market, holding.gainAfterTax)}`}
                      >
                        {holding.gainAfterTax >= 0 ? "+" : ""}
                        {formatPrice(holding.gainAfterTax, holding.currency)}
                        <p className="text-xs text-muted-foreground">
                          {formatChangePercent(holding.gainPercentAfterTax)}
                        </p>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatKrw(holding.valueKrw)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => removePosition(holding.id)}
                        >
                          삭제
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
