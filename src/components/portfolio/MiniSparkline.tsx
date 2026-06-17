"use client";

import { Area, AreaChart, YAxis } from "recharts";

import type { Market } from "@/types/market";

interface MiniSparklineProps {
  data: number[];
  market: Market;
}

export function MiniSparkline({ data, market }: MiniSparklineProps) {
  if (data.length < 2) {
    return (
      <div className="flex h-12 w-28 items-center justify-center text-xs text-muted-foreground">
        —
      </div>
    );
  }

  const first = data[0];
  const last = data[data.length - 1];
  const isUp = last >= first;
  const stroke =
    market === "KR"
      ? isUp
        ? "#ef4444"
        : "#3b82f6"
      : isUp
        ? "#10b981"
        : "#f43f5e";

  const chartData = data.map((price, index) => ({ index, price }));

  return (
    <AreaChart width={112} height={48} data={chartData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
      <YAxis domain={["dataMin", "dataMax"]} hide width={0} />
      <Area
        type="monotone"
        dataKey="price"
        stroke={stroke}
        fill={stroke}
        fillOpacity={0.15}
        strokeWidth={1.5}
        isAnimationActive={false}
      />
    </AreaChart>
  );
}
