import type { Market } from "@/types/market";

interface MiniSparklineProps {
  data: number[];
  market: Market;
}

const WIDTH = 112;
const HEIGHT = 48;
const PADDING_Y = 4;

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

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const stepX = WIDTH / (data.length - 1);
  const innerHeight = HEIGHT - PADDING_Y * 2;

  const points = data.map((price, index) => {
    const x = index * stepX;
    const y = PADDING_Y + innerHeight * (1 - (price - min) / range);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const linePath = `M${points.join(" L")}`;
  const areaPath = `${linePath} L${WIDTH},${HEIGHT} L0,${HEIGHT} Z`;

  return (
    <svg
      width={WIDTH}
      height={HEIGHT}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="shrink-0"
      aria-hidden="true"
    >
      <path d={areaPath} fill={stroke} fillOpacity={0.15} />
      <path
        d={linePath}
        fill="none"
        stroke={stroke}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
