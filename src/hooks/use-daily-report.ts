"use client";

import { useCallback, useEffect, useState } from "react";

import { usePortfolioHydrated } from "@/hooks/use-portfolio-hydrated";
import {
  hasCachedReportForDate,
  useDailyReportStore,
} from "@/store/daily-report-store";
import { usePortfolioStore } from "@/store/portfolio-store";
import { getPredictionSessionDate } from "@/lib/kr-market-time";
import type { DailyReportApiResponse } from "@/types/daily-report";

export function useDailyReport() {
  const hydrated = usePortfolioHydrated();
  const positions = usePortfolioStore((state) => state.positions);
  const cachedReport = useDailyReportStore((state) => state.report);
  const cachedTargetDate = useDailyReportStore((state) => state.targetDate);
  const setReport = useDailyReportStore((state) => state.setReport);
  const clearIfStale = useDailyReportStore((state) => state.clearIfStale);

  const [state, setState] = useState<{
    pending: boolean;
    pendingMessage?: string;
    loading: boolean;
    error: string | null;
    fetchedAt: string | null;
  }>({
    pending: false,
    loading: true,
    error: null,
    fetchedAt: null,
  });

  const load = useCallback(
    async (force = false) => {
      if (!hydrated) return;

      const sessionDate = getPredictionSessionDate();
      clearIfStale(sessionDate);

      if (
        !force &&
        hasCachedReportForDate(cachedReport, cachedTargetDate, sessionDate)
      ) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: null,
        }));
        return;
      }

      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const symbols = positions.map((position) => position.symbol).join(",");
        const holdings = positions
          .filter((position) => position.market === "KR")
          .map((position) => `${position.symbol}|${position.name}`)
          .join(";");
        const params = new URLSearchParams();
        if (symbols) params.set("symbols", symbols);
        if (holdings) params.set("holdings", holdings);

        const query = params.toString() ? `?${params.toString()}` : "";
        const response = await fetch(`/api/daily-report${query}`, {
          cache: "no-store",
        });

        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as {
            error?: string;
          } | null;
          throw new Error(body?.error ?? "일일 보고서 로드 실패");
        }

        const data = (await response.json()) as DailyReportApiResponse;
        setReport(data.report);
        setState({
          pending: data.pending,
          pendingMessage: data.pendingMessage,
          loading: false,
          error: null,
          fetchedAt: data.fetchedAt,
        });
      } catch (error) {
        setState({
          pending: false,
          loading: false,
          error:
            error instanceof Error ? error.message : "일일 보고서 로드 실패",
          fetchedAt: null,
        });
      }
    },
    [
      hydrated,
      positions,
      cachedReport,
      cachedTargetDate,
      setReport,
      clearIfStale,
    ],
  );

  useEffect(() => {
    void load();
  }, [load]);

  return {
    report: cachedReport,
    ...state,
    refresh: () => load(true),
  };
}
