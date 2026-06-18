"use client";

import { useMemo } from "react";
import { RefreshCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  PickCardShell,
  ScoreProgress,
} from "@/components/undervalued/ScoreProgress";
import { useUndervaluedLive } from "@/hooks/use-undervalued-live";
import {
  getDisplayedPicks,
  useUndervaluedStore,
} from "@/store/undervalued-store";
import { UNDERVALUED_THEME_FILTERS } from "@/types/undervalued";
import type { UndervaluedPick, UndervaluedThemeFilter } from "@/types/undervalued";

function formatPrice(pick: UndervaluedPick): string {
  if (pick.currency === "KRW") {
    return `${pick.currentPrice.toLocaleString()}원`;
  }
  return `$${pick.currentPrice.toFixed(2)}`;
}

function formatChangePercent(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

function formatRatioPercent(value: number): string {
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
            {typeof pick.changePercent === "number" ? (
              <p
                className={
                  pick.changePercent >= 0
                    ? "text-[11px] text-red-500"
                    : "text-[11px] text-blue-500"
                }
              >
                {formatChangePercent(pick.changePercent)}
              </p>
            ) : null}
            <p className="text-[11px] text-red-400">
              {pick.discountPercent > 0
                ? `업종 대비 -${pick.discountPercent}%`
                : `업종 대비 +${Math.abs(pick.discountPercent)}%`}
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
              {formatRatioPercent(pick.roe)}
            </p>
          </div>
        </div>

        <ScoreProgress score={pick.undervaluedScore} />
      </div>
    </PickCardShell>
  );
}

export function UndervaluedTop10() {
  const { loading, error, fetchedAt, liveReady, refresh } = useUndervaluedLive();
  const themeFilter = useUndervaluedStore((state) => state.themeFilter);
  const allPicks = useUndervaluedStore((state) => state.allPicks);
  const picksByTheme = useUndervaluedStore((state) => state.picksByTheme);
  const selectedId = useUndervaluedStore((state) => state.selectedId);
  const setThemeFilter = useUndervaluedStore((state) => state.setThemeFilter);
  const selectPick = useUndervaluedStore((state) => state.selectPick);

  const displayedPicks = useMemo(
    () => getDisplayedPicks({ allPicks, picksByTheme }, themeFilter),
    [allPicks, picksByTheme, themeFilter],
  );

  const fetchedLabel = fetchedAt
    ? new Date(fetchedAt).toLocaleTimeString("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : null;

  return (
    <section className="space-y-5">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold">국내 저평가 TOP 10</h2>
        <p className="text-sm text-muted-foreground">
          네이버 증권 업종별 시가총액 상위 종목을 PER·PBR·ROE로 스크리닝합니다.
        </p>
        {liveReady && fetchedLabel ? (
          <p className="text-xs text-muted-foreground">
            네이버 증권 실시간 · {fetchedLabel} 갱신
          </p>
        ) : null}
      </div>

      {error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Tabs
          value={themeFilter}
          onValueChange={(value) =>
            setThemeFilter(value as UndervaluedThemeFilter)
          }
          className="min-w-0 flex-1"
        >
          <TabsList className="h-auto w-full flex-wrap justify-start md:w-fit">
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

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0 gap-1.5"
          onClick={() => void refresh({ force: true })}
          disabled={loading}
          aria-label="시세 새로고침"
        >
          <RefreshCw className={loading ? "size-4 animate-spin" : "size-4"} />
          {loading ? "불러오는 중…" : "새로고침"}
        </Button>
      </div>

      {loading || !liveReady ? (
        <div className="rounded-xl border border-dashed px-4 py-12 text-center text-sm text-muted-foreground">
          네이버 증권에서 실시간 시세를 불러오는 중입니다…
        </div>
      ) : displayedPicks.length === 0 ? (
        <div className="rounded-xl border border-dashed px-4 py-12 text-center text-sm text-muted-foreground">
          해당 테마의 저평가 종목이 없습니다.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {displayedPicks.map((pick) => (
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
