"use client";

import { useMemo } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  PickCardShell,
  ScoreProgress,
} from "@/components/undervalued/ScoreProgress";
import { useUndervaluedLive } from "@/hooks/use-undervalued-live";
import { useUndervaluedStore } from "@/store/undervalued-store";
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
  const { loading, error, fetchedAt, source, refresh } = useUndervaluedLive();
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

  const fetchedLabel = fetchedAt
    ? new Date(fetchedAt).toLocaleTimeString("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : null;

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">국내 저평가 TOP 10</h2>
          <p className="text-sm text-muted-foreground">
            코스피·코스닥 종목 — 네이버 증권 시세·PER·PBR·ROE 기준 저평가 스크리닝
            (1분마다 갱신)
          </p>
          {fetchedLabel ? (
            <p className="mt-1 text-xs text-muted-foreground">
              네이버 증권 · {fetchedLabel}
            </p>
          ) : null}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void refresh()}
          disabled={loading}
        >
          {loading ? "불러오는 중…" : "새로고침"}
        </Button>
      </div>

      {error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <Tabs
        value={themeFilter}
        onValueChange={(value) =>
          setThemeFilter(value as UndervaluedThemeFilter)
        }
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

      {loading && filteredPicks.length === 0 ? (
        <div className="rounded-xl border border-dashed px-4 py-12 text-center text-sm text-muted-foreground">
          네이버 증권에서 시세를 불러오는 중입니다…
        </div>
      ) : filteredPicks.length === 0 ? (
        <div className="rounded-xl border border-dashed px-4 py-12 text-center text-sm text-muted-foreground">
          해당 테마의 저평가 종목이 없습니다.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
