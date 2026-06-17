import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface ScoreProgressProps {
  score: number;
  className?: string;
}

export function ScoreProgress({ score, className }: ScoreProgressProps) {
  const clamped = Math.min(100, Math.max(0, score));

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">저평가 매력 점수</span>
        <span className="font-semibold text-emerald-600">{clamped}점</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-emerald-500 transition-all duration-500"
          style={{ width: `${clamped}%` }}
          role="progressbar"
          aria-valuenow={clamped}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`저평가 매력 점수 ${clamped}점`}
        />
      </div>
    </div>
  );
}

function isHighScore(score: number): boolean {
  return score >= 90;
}

interface PickCardShellProps {
  score: number;
  selected?: boolean;
  onClick?: () => void;
  children: ReactNode;
  className?: string;
}

export function PickCardShell({
  score,
  selected,
  onClick,
  children,
  className,
}: PickCardShellProps) {
  const highlighted = isHighScore(score);

  if (highlighted) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "group relative w-full rounded-xl p-[1px] text-left transition-transform hover:scale-[1.01]",
          selected
            ? "bg-gradient-to-br from-violet-500 via-fuchsia-500 to-emerald-500"
            : "bg-gradient-to-br from-violet-400/60 via-fuchsia-400/50 to-emerald-400/60 hover:from-violet-500/80 hover:to-emerald-500/80",
          className,
        )}
      >
        <div className="rounded-[11px] bg-card p-4">{children}</div>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full rounded-xl border border-border bg-card p-4 text-left transition-all hover:border-violet-300 hover:shadow-sm",
        selected && "border-violet-400 ring-1 ring-violet-400/30",
        className,
      )}
    >
      {children}
    </button>
  );
}

export { isHighScore };
