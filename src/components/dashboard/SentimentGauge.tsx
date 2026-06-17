import { cn } from "@/lib/utils";
import type { MarketSentimentLevel } from "@/types/market-tone";

const LEVEL_CONFIG: Record<
  MarketSentimentLevel,
  { label: string; className: string; markerClassName: string }
> = {
  fear: {
    label: "공포",
    className: "text-blue-500",
    markerClassName: "border-blue-500 bg-blue-500",
  },
  neutral: {
    label: "중립",
    className: "text-muted-foreground",
    markerClassName: "border-muted-foreground bg-muted-foreground",
  },
  greed: {
    label: "탐욕",
    className: "text-red-500",
    markerClassName: "border-red-500 bg-red-500",
  },
};

interface SentimentGaugeProps {
  score: number;
  level: MarketSentimentLevel;
  label: string;
  className?: string;
}

export function SentimentGauge({
  score,
  level,
  label,
  className,
}: SentimentGaugeProps) {
  const config = LEVEL_CONFIG[level];
  const markerLeft = `${Math.min(100, Math.max(0, score))}%`;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-end justify-between gap-2">
        <div>
          <p className="text-xs text-muted-foreground">시장 투자 심리</p>
          <p className={cn("text-2xl font-bold tracking-tight", config.className)}>
            {label}
          </p>
        </div>
        <p className="text-sm font-medium text-muted-foreground">{score}/100</p>
      </div>

      <div className="relative pt-1">
        <div
          className="h-2.5 overflow-hidden rounded-full bg-gradient-to-r from-blue-500 via-muted to-red-500"
          role="meter"
          aria-valuenow={score}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`시장 투자 심리 ${label}`}
        />
        <div
          className="absolute top-0 -translate-x-1/2"
          style={{ left: markerLeft }}
        >
          <div
            className={cn(
              "size-4 rounded-full border-2 bg-background shadow-sm",
              config.markerClassName,
            )}
          />
        </div>
      </div>

      <div className="flex justify-between text-[11px] text-muted-foreground">
        <span>공포</span>
        <span>중립</span>
        <span>탐욕</span>
      </div>
    </div>
  );
}
