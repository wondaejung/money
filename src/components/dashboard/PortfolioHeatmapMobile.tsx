"use client";

import Link from "next/link";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";

import {
  formatChangePercent,
  getChangeTextClass,
} from "@/lib/market-colors";
import type { TreemapNode } from "@/types/stock";

function formatKrw(value: number): string {
  if (value >= 100_000_000) {
    return `${(value / 100_000_000).toFixed(1)}억`;
  }
  if (value >= 10_000) {
    return `${Math.round(value / 10_000).toLocaleString()}만`;
  }
  return `${Math.round(value / 1_000).toLocaleString()}천`;
}

function getBarColor(market: TreemapNode["market"], changePercent: number): string {
  if (market === "KR") {
    return changePercent >= 0 ? "#ef4444" : "#3b82f6";
  }
  return changePercent >= 0 ? "#10b981" : "#f43f5e";
}

interface PortfolioHeatmapMobileProps {
  data: TreemapNode[];
  totalValueKrw: number;
  positionsCount: number;
  hydrated: boolean;
}

export function PortfolioHeatmapMobile({
  data,
  totalValueKrw,
  positionsCount,
  hydrated,
}: PortfolioHeatmapMobileProps) {
  const top5 = [...data]
    .sort((a, b) => b.size - a.size)
    .slice(0, 5)
    .map((item) => ({
      ...item,
      weight: totalValueKrw > 0 ? (item.size / totalValueKrw) * 100 : 0,
      shortName: item.name.length > 8 ? `${item.name.slice(0, 7)}…` : item.name,
    }));

  if (top5.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-10 text-center">
        <p className="text-sm text-muted-foreground">
          {hydrated && positionsCount > 0
            ? `저장된 종목 ${positionsCount}개 — 시세를 불러오는 중입니다…`
            : "등록된 종목이 없습니다."}
        </p>
        {positionsCount === 0 && (
          <Link
            href="/portfolio"
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border bg-background px-4 text-sm font-medium hover:bg-muted"
          >
            포트폴리오에서 종목 추가
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="h-52 w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <BarChart
            data={top5}
            layout="vertical"
            margin={{ top: 0, right: 8, left: 0, bottom: 0 }}
          >
            <XAxis type="number" hide domain={[0, "dataMax"]} />
            <YAxis
              type="category"
              dataKey="shortName"
              width={72}
              tick={{ fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <Bar dataKey="size" radius={[0, 4, 4, 0]} barSize={20}>
              {top5.map((entry) => (
                <Cell
                  key={entry.symbol}
                  fill={getBarColor(entry.market, entry.changePercent)}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <ul className="space-y-2">
        {top5.map((item, index) => (
          <li
            key={item.symbol}
            className="rounded-lg border bg-card p-3"
          >
            <div className="mb-2 flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">TOP {index + 1}</p>
                <p className="truncate font-medium">{item.name}</p>
                <p className="text-xs text-muted-foreground">{item.symbol}</p>
              </div>
              <div className="text-right">
                <p className="font-mono text-sm font-medium">
                  {formatKrw(item.size)}원
                </p>
                <p
                  className={`text-xs font-medium ${getChangeTextClass(item.market, item.changePercent)}`}
                >
                  {formatChangePercent(item.changePercent)}
                </p>
              </div>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary/70"
                style={{ width: `${Math.min(100, item.weight)}%` }}
              />
            </div>
            <p className="mt-1 text-right text-[11px] text-muted-foreground">
              비중 {item.weight.toFixed(1)}%
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
