import { ArrowDown, ArrowRight, ArrowUp } from "lucide-react";

import type { WeekTrend } from "@/types/insights";
import { cn } from "@/lib/utils";

const TREND_CONFIG: Record<
  WeekTrend,
  { label: string; className: string; Icon: typeof ArrowUp }
> = {
  up: { label: "상승", className: "text-red-500", Icon: ArrowUp },
  side: { label: "횡보", className: "text-muted-foreground", Icon: ArrowRight },
  down: { label: "하락", className: "text-blue-500", Icon: ArrowDown },
};

interface TrendIndicatorProps {
  trend: WeekTrend;
  className?: string;
}

export function TrendIndicator({ trend, className }: TrendIndicatorProps) {
  const config = TREND_CONFIG[trend];
  const Icon = config.Icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-sm font-medium",
        config.className,
        className,
      )}
    >
      <Icon className="size-4" aria-hidden />
      {config.label}
    </span>
  );
}
