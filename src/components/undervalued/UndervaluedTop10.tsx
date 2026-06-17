"use client";

import { useMemo } from "react";

import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  PickCardShell,
  ScoreProgress,
} from "@/components/undervalued/ScoreProgress";
import { useUndervaluedStore } from "@/store/undervalued-store";
import { UNDERVALUED_THEME_FILTERS } from "@/types/undervalued";
import type { UndervaluedPick, UndervaluedThemeFilter } from "@/types/undervalued";

function formatPrice(pick: UndervaluedPick): string {
  if (pick.currency === "KRW") {
    return `${pick.currentPrice.toLocaleString()}원`;
  }
  return `$${pick.currentPrice.toFixed(2)}`;
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function MarketBadge({ market }: { market: UndervaluedPick["market"] }) {
  return (
    <Badge
      variant="outline"
      className={
        market === "KR"
          ? "border-red-500/40 text-red-600"
          : "border-emerald-500/40 text-emerald-600"
      }
    >
      {market}
    </Badge>
  );
}

function PickCard({
  pick,
  selected,
  onSelect,
}: {
  pick: UndervaluedPick;
  selected: boolean;
  onSelect: () => void;
}) {
  const perDiscount =
    pick.sectorAvgPer > 0
      ? Math.round((1 - pick.per / pick.sectorAvgPer) * 100)
      : 0;

  return (
    <PickCardShell score={pick.undervaluedScore} selected={selected} onClick={onSelect}>
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="mb-1 flex flex-wrap items-center gap-1.5">
              <Badge variant="secondary" className="text-[10px]">
                {pick.themeLabel}
              </Badge>
              <MarketBadge market={pick.market} />
            </div>
            <h3 className="truncate font-semibold text-foreground">{pick.name}</h3>
            <p className="font-mono text-xs text-muted-foreground">{pick.ticker}</p>
          </div>
          <div className="text-right">
            <p className="font-mono text-sm font-medium">{formatPrice(pick)}</p>
            <p className="text-[11px] text-red-400">
              업종 대비 -{pick.discountPercent}%
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 rounded-lg bg-muted/60 px-2 py-2 text-center text-[11px]">
          <div>
            <p className="text-muted-foreground">PER</p>
            <p className="font-mono font-medium text-foreground">{pick.per.toFixed(1)}</p>
            <p className="text-[10px] text-muted-foreground">
              업종 {pick.sectorAvgPer.toFixed(1)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">PBR</p>
            <p className="font-mono font-medium text-foreground">{pick.pbr.toFixed(2)}</p>
            <p className="text-[10px] text-violet-400">-{perDiscount}%</p>
          </div>
          <div>
            <p className="text-muted-foreground">ROE</p>
            <p className="font-mono font-medium text-foreground">
              {formatPercent(pick.roe)}
            </p>
          </div>
        </div>

        <ScoreProgress score={pick.undervaluedScore} />
      </div>
    </PickCardShell>
  );
}

export function UndervaluedTop10() {
  const themeFilter = useUndervaluedStore((state) => state.themeFilter);
  const picks = useUndervaluedStore((state) => state.picks);
  const selectedId = useUndervaluedStore((state) => state.selectedId);
  const setThemeFilter = useUndervaluedStore((state) => state.setThemeFilter);
  const selectPick = useUndervaluedStore((state) => state.selectPick);

  const filteredPicks = useMemo(
    () =>
      themeFilter === "all"
        ? picks
        : picks.filter((pick) => pick.theme === themeFilter),
    [picks, themeFilter],
  );

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold">국내 저평가 TOP 10</h2>
        <p className="text-sm text-muted-foreground">
          코스피·코스닥 종목 — PER·PBR·ROE·낙폭 과대를 종합한 밸류 스크리닝
          결과입니다.
        </p>
      </div>

      <Tabs
        value={themeFilter}
        onValueChange={(value) =>
          setThemeFilter(value as UndervaluedThemeFilter)
        }
      >
        <TabsList className="h-auto flex-wrap">
          {UNDERVALUED_THEME_FILTERS.map((filter) => (
            <TabsTrigger
              key={filter.value}
              value={filter.value}
              className="text-xs sm:text-sm"
            >
              {filter.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {filteredPicks.length === 0 ? (
        <div className="rounded-xl border border-dashed px-4 py-12 text-center text-sm text-muted-foreground">
          해당 테마의 저평가 종목이 없습니다.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filteredPicks.map((pick) => (
            <PickCard
              key={pick.id}
              pick={pick}
              selected={selectedId === pick.id}
              onSelect={() => selectPick(pick.id)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
