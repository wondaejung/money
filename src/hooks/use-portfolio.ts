"use client";

import { useCallback, useEffect, useState } from "react";

import { usePortfolioHydrated } from "@/hooks/use-portfolio-hydrated";
import { usePortfolioStore } from "@/store/portfolio-store";
import type { LiveHolding } from "@/types/portfolio";
import type { LivePortfolioApiResponse } from "@/types/quote";

interface PortfolioState {
  holdings: LiveHolding[];
  usdToKrw: number;
  fxSource?: "naver" | "fallback";
  fxValid?: boolean;
  fetchedAt: string | null;
  loading: boolean;
  error: string | null;
}

const REFRESH_MS = 30_000;

export function usePortfolio() {
  const hydrated = usePortfolioHydrated();
  const positions = usePortfolioStore((state) => state.positions);

  const [state, setState] = useState<PortfolioState>({
    holdings: [],
    usdToKrw: 1350,
    fetchedAt: null,
    loading: true,
    error: null,
  });

  const load = useCallback(async () => {
    if (positions.length === 0) {
      if (!hydrated) {
        setState((prev) => ({ ...prev, loading: true, error: null }));
        return;
      }

      setState({
        holdings: [],
        usdToKrw: 1350,
        fetchedAt: null,
        loading: false,
        error: null,
      });
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const response = await fetch("/api/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ positions }),
        cache: "no-store",
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error ?? "포트폴리오 데이터 로드 실패");
      }

      const data = (await response.json()) as LivePortfolioApiResponse;

      setState({
        holdings: data.holdings,
        usdToKrw: data.usdToKrw,
        fxSource: data.fxSource,
        fxValid: data.fxValid,
        fetchedAt: data.fetchedAt,
        loading: false,
        error: null,
      });
    } catch (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error:
          error instanceof Error
            ? error.message
            : "포트폴리오 데이터 로드 실패",
      }));
    }
  }, [hydrated, positions]);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [load]);

  return { ...state, refresh: load };
}
