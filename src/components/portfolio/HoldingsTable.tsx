"use client";

import { useMemo, useState } from "react";

import { RefreshCw } from "lucide-react";

import { MiniSparkline } from "@/components/portfolio/MiniSparkline";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
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
import { formatKrw, formatPrice } from "@/lib/format-money";
import {
  formatChangePercent,
  getChangeBorderClass,
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
  fxValid?: boolean;
}

type SortMode = "value" | "gainPercent";

const SORT_LABELS: Record<SortMode, string> = {
  value: "평가금액순",
  gainPercent: "수익률순",
};

function FilterChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-xs transition-colors",
        active
          ? "border-foreground bg-foreground text-background"
          : "border-border text-muted-foreground hover:bg-muted",
      )}
    >
      {label}
    </button>
  );
}

export function HoldingsTable({
  positions,
  holdings,
  hydrated,
  loading,
  error,
  priceFlash,
  fetchedAt,
  fxValid,
}: HoldingsTableProps) {
  const removePosition = usePortfolioStore((state) => state.removePosition);
  const [sortMode, setSortMode] = useState<SortMode>("value");
  const [lossOnly, setLossOnly] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const displayRows = useMemo(
    () => mergePortfolioDisplayRows(positions, holdings),
    [positions, holdings],
  );
  const liveHoldings = useMemo(
    () => getLiveHoldingsFromRows(displayRows),
    [displayRows],
  );
  const pendingRows = displayRows.filter((row) => row.kind === "pending");
  const totalValueKrw = liveHoldings.reduce((sum, h) => sum + h.valueKrw, 0);

  const sortedHoldings = useMemo(() => {
    const filtered = lossOnly
      ? liveHoldings.filter((h) => h.gainAfterTaxKrw < 0)
      : liveHoldings;

    return [...filtered].sort((a, b) =>
      sortMode === "value"
        ? b.valueKrw - a.valueKrw
        : b.gainPercentAfterTax - a.gainPercentAfterTax,
    );
  }, [liveHoldings, lossOnly, sortMode]);

  const lossCount = liveHoldings.filter((h) => h.gainAfterTaxKrw < 0).length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>보유 종목</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">저장 {positions.length}종목</Badge>
            {pendingRows.length > 0 && (
              <Badge variant="outline">
                {loading ? "시세 로딩" : "시세 없음"} {pendingRows.length}
              </Badge>
            )}
            {fetchedAt && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <RefreshCw className="h-3 w-3" aria-hidden />
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
      <CardContent className="space-y-3">
        {hydrated && positions.length === 0 && (
          <p className="rounded-lg border border-dashed px-3 py-2 text-xs text-muted-foreground">
            종목은 이 브라우저에만 저장됩니다.{" "}
            <strong className="font-medium text-foreground">localhost</strong>와{" "}
            <strong className="font-medium text-foreground">127.0.0.1</strong>은
            별도 저장소이니 주소를 통일해 주세요.
          </p>
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

        {liveHoldings.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {(Object.keys(SORT_LABELS) as SortMode[]).map((mode) => (
              <FilterChip
                key={mode}
                active={sortMode === mode}
                label={SORT_LABELS[mode]}
                onClick={() => setSortMode(mode)}
              />
            ))}
            <FilterChip
              active={lossOnly}
              label={`손실만${lossCount > 0 ? ` ${lossCount}` : ""}`}
              onClick={() => setLossOnly((prev) => !prev)}
            />
          </div>
        )}

        {!hydrated && positions.length === 0 ? (
          <div className="h-48 animate-pulse rounded-lg bg-muted" />
        ) : displayRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            등록된 종목이 없습니다. 아래에서 종목을 추가하세요.
          </p>
        ) : (
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[34%]">종목</TableHead>
                  <TableHead className="text-right">현재가·등락</TableHead>
                  <TableHead className="text-right">세후 손익</TableHead>
                  <TableHead className="text-right">평가·비중</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedHoldings.map((holding) => {
                  const expanded = expandedId === holding.id;
                  const weightPercent =
                    totalValueKrw > 0
                      ? (holding.valueKrw / totalValueKrw) * 100
                      : 0;
                  const gainPositive = holding.gainAfterTax >= 0;

                  return (
                    <TableRow
                      key={holding.id}
                      className="cursor-pointer"
                      onClick={() =>
                        setExpandedId(expanded ? null : holding.id)
                      }
                    >
                      <TableCell
                        className={cn(
                          "border-l-[3px] py-2.5",
                          getChangeBorderClass(
                            holding.market,
                            holding.gainAfterTax,
                          ),
                        )}
                      >
                        <p className="truncate font-medium">{holding.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {holding.symbol} · {holding.shares.toLocaleString()}주
                        </p>
                        {expanded && (
                          <div
                            className="mt-3 space-y-3"
                            onClick={(event) => event.stopPropagation()}
                          >
                            <MiniSparkline
                              data={holding.sparkline}
                              market={holding.market}
                            />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="py-2.5 text-right align-top">
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
                            className={cn(
                              "text-xs",
                              getChangeTextClass(
                                holding.market,
                                holding.changePercent,
                              ),
                            )}
                          >
                            {formatChangePercent(holding.changePercent)}
                          </p>
                        </div>
                        {expanded && (
                          <div className="mt-3 text-xs text-muted-foreground">
                            <p>매수가</p>
                            <p className="font-mono text-sm text-foreground">
                              {formatPrice(
                                holding.purchasePrice,
                                holding.currency,
                              )}
                            </p>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="py-2.5 text-right align-top">
                        <p
                          className={cn(
                            "font-mono text-sm font-medium",
                            getChangeTextClass(
                              holding.market,
                              holding.gainAfterTax,
                            ),
                          )}
                        >
                          {gainPositive ? "+" : ""}
                          {formatPrice(holding.gainAfterTax, holding.currency)}
                        </p>
                        <p
                          className={cn(
                            "text-xs",
                            getChangeTextClass(
                              holding.market,
                              holding.gainAfterTax,
                            ),
                          )}
                        >
                          {formatChangePercent(holding.gainPercentAfterTax)}
                        </p>
                        {expanded && (
                          <div className="mt-3 text-xs text-muted-foreground">
                            <p>세전 손익</p>
                            <p
                              className={cn(
                                "font-mono text-sm",
                                getChangeTextClass(
                                  holding.market,
                                  holding.gainAmount,
                                ),
                              )}
                            >
                              {holding.gainAmount >= 0 ? "+" : ""}
                              {formatPrice(
                                holding.gainAmount,
                                holding.currency,
                              )}{" "}
                              ({formatChangePercent(holding.gainPercent)})
                            </p>
                            <p className="mt-1.5">세금·수수료</p>
                            <p className="font-mono text-sm text-foreground">
                              {formatPrice(
                                holding.estimatedTax + holding.totalCommission,
                                holding.currency,
                              )}
                            </p>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="py-2.5 text-right align-top">
                        <p className="font-mono text-sm">
                          {formatKrw(holding.valueKrw)}
                        </p>
                        <div className="mt-1.5 ml-auto h-1 w-full max-w-24 rounded-full bg-muted">
                          <div
                            className="h-1 rounded-full bg-muted-foreground"
                            style={{
                              width: `${Math.max(Math.min(weightPercent, 100), 2)}%`,
                            }}
                          />
                        </div>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {weightPercent.toFixed(1)}%
                        </p>
                        {expanded && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="mt-2 text-destructive"
                            onClick={(event) => {
                              event.stopPropagation();
                              removePosition(holding.id);
                            }}
                          >
                            삭제
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}

                {!lossOnly &&
                  pendingRows.map((row) => {
                    if (row.kind !== "pending") return null;
                    const position = row.position;

                    return (
                      <TableRow key={position.id} className="bg-muted/20">
                        <TableCell className="border-l-[3px] border-l-muted py-2.5">
                          <p className="truncate font-medium">{position.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {position.symbol} ·{" "}
                            {position.shares.toLocaleString()}주
                          </p>
                        </TableCell>
                        <TableCell
                          colSpan={2}
                          className="py-2.5 text-right text-xs text-muted-foreground"
                        >
                          {loading ? "시세 로딩 중…" : "시세 없음"} · 매수가{" "}
                          {formatPrice(position.purchasePrice, position.currency)}
                        </TableCell>
                        <TableCell className="py-2.5 text-right">
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
                  })}
              </TableBody>
            </Table>
          </div>
        )}

        {sortedHoldings.length > 0 && (
          <p className="text-center text-xs text-muted-foreground">
            행을 누르면 매수가 · 세전 손익 · 세금 내역 · 당일 차트가 펼쳐집니다
          </p>
        )}

        {lossOnly && sortedHoldings.length === 0 && liveHoldings.length > 0 && (
          <p className="text-sm text-muted-foreground">
            세후·수수료 기준 손실 종목이 없습니다.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
