"use client";

import { useCallback, useEffect, useState } from "react";

import { usePortfolioHydrated } from "@/hooks/use-portfolio-hydrated";
import { usePortfolioStore } from "@/store/portfolio-store";
import type { MarketToneApiResponse } from "@/types/market-tone";

export function useMarketTone() {
  const hydrated = usePortfolioHydrated();
  const positions = usePortfolioStore((state) => state.positions);
  const [state, setState] = useState<{
    data: MarketToneApiResponse | null;
    loading: boolean;
    error: string | null;
  }>({
    data: null,
    loading: true,
    error: null,
  });

  const load = useCallback(async () => {
    if (!hydrated) return;

    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const symbols = positions.map((position) => position.symbol).join(",");
      const query = symbols ? `?symbols=${encodeURIComponent(symbols)}` : "";
      const response = await fetch(`/api/market-tone${query}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error ?? "시장 센티멘트 로드 실패");
      }

      const data = (await response.json()) as MarketToneApiResponse;
      setState({ data, loading: false, error: null });
    } catch (error) {
      setState({
        data: null,
        loading: false,
        error:
          error instanceof Error ? error.message : "시장 센티멘트 로드 실패",
      });
    }
  }, [hydrated, positions]);

  useEffect(() => {
    void load();
  }, [load]);

  return { ...state, refresh: load };
}
