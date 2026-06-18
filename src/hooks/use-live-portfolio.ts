"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { usePortfolioHydrated } from "@/hooks/use-portfolio-hydrated";
import { usePortfolioStore } from "@/store/portfolio-store";
import type { LiveHolding, SellRecommendation } from "@/types/portfolio";
import type { LivePortfolioApiResponse } from "@/types/quote";

interface LivePortfolioState {
  holdings: LiveHolding[];
  sellRecommendations: SellRecommendation[];
  sellAdviceSource?: "llm" | "rule";
  sellAdviceLlmError?: string;
  usdToKrw: number;
  fxSource?: "naver" | "yahoo" | "fallback";
  fxValid?: boolean;
  fetchedAt: string | null;
  loading: boolean;
  error: string | null;
  priceFlash: Record<string, "up" | "down" | null>;
}

const REFRESH_MS = 30_000;

export function useLivePortfolio() {
  const hydrated = usePortfolioHydrated();
  const positions = usePortfolioStore((state) => state.positions);
  const prevPrices = useRef<Record<string, number>>({});

  const [state, setState] = useState<LivePortfolioState>({
    holdings: [],
    sellRecommendations: [],
    usdToKrw: 1350,
    fetchedAt: null,
    loading: true,
    error: null,
    priceFlash: {},
  });

  const load = useCallback(async () => {
    if (positions.length === 0) {
      if (!hydrated) {
        setState((prev) => ({ ...prev, loading: true, error: null }));
        return;
      }

      setState({
        holdings: [],
        sellRecommendations: [],
        usdToKrw: 1350,
        fetchedAt: null,
        loading: false,
        error: null,
        priceFlash: {},
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
      const priceFlash: Record<string, "up" | "down" | null> = {};

      for (const holding of data.holdings) {
        const prev = prevPrices.current[holding.id];
        if (prev !== undefined && prev !== holding.currentPrice) {
          priceFlash[holding.id] =
            holding.currentPrice > prev ? "up" : "down";
        }
        prevPrices.current[holding.id] = holding.currentPrice;
      }

      setState({
        holdings: data.holdings,
        sellRecommendations: data.sellRecommendations,
        sellAdviceSource: data.sellAdviceSource,
        sellAdviceLlmError: data.sellAdviceLlmError,
        usdToKrw: data.usdToKrw,
        fxSource: data.fxSource,
        fxValid: data.fxValid,
        fetchedAt: data.fetchedAt,
        loading: false,
        error: null,
        priceFlash,
      });

      window.setTimeout(() => {
        setState((prev) => ({ ...prev, priceFlash: {} }));
      }, 1200);
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

  return { ...state, refresh: load, positions };
}
