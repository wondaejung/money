"use client";

import { useCallback, useEffect, useState } from "react";

import { usePortfolioHydrated } from "@/hooks/use-portfolio-hydrated";
import { usePortfolioStore } from "@/store/portfolio-store";
import { usePredictionStore } from "@/store/prediction-store";
import type { PredictionsApiResponse } from "@/types/prediction";

const PROVIDER_LABEL: Record<string, string> = {
  groq: "Groq",
  gemini: "Gemini",
  openai: "OpenAI",
  anthropic: "Anthropic",
  ollama: "Ollama",
};

export function useClosingBellSnapshot() {
  const hydrated = usePortfolioHydrated();
  const positions = usePortfolioStore((state) => state.positions);
  const saveSnapshot = usePredictionStore((state) => state.saveSnapshot);
  const initialize = usePredictionStore((state) => state.initialize);

  const [state, setState] = useState<{
    data: PredictionsApiResponse | null;
    loading: boolean;
    error: string | null;
  }>({
    data: null,
    loading: true,
    error: null,
  });

  const load = useCallback(async () => {
    if (!hydrated) return;

    initialize();
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const symbols = positions.map((position) => position.symbol).join(",");
      const query = symbols ? `?symbols=${encodeURIComponent(symbols)}` : "";
      const response = await fetch(`/api/predictions${query}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error ?? "예측 데이터 로드 실패");
      }

      const data = (await response.json()) as PredictionsApiResponse;
      saveSnapshot(data.snapshot);

      setState({ data, loading: false, error: null });
    } catch (error) {
      setState({
        data: null,
        loading: false,
        error:
          error instanceof Error ? error.message : "예측 데이터 로드 실패",
      });
    }
  }, [hydrated, initialize, positions, saveSnapshot]);

  useEffect(() => {
    void load();
  }, [load]);

  const providerLabel = state.data?.llmProvider
    ? PROVIDER_LABEL[state.data.llmProvider] ?? state.data.llmProvider
    : null;

  return {
    ...state,
    providerLabel,
    refresh: load,
  };
}
