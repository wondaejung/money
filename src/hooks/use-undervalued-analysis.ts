"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { UndervaluedPick } from "@/types/undervalued";
import type {
  UndervaluedAnalysisApiResponse,
  UndervaluedDeepAnalysis,
} from "@/types/undervalued-analysis";

interface UseUndervaluedAnalysisState {
  analysis: UndervaluedDeepAnalysis | null;
  loading: boolean;
  error: string | null;
  llmAvailable: boolean;
  cached: boolean;
  refresh: () => void;
}

function buildAnalysisUrl(pick: UndervaluedPick, refresh = false): string {
  const params = new URLSearchParams({
    ticker: pick.ticker,
    name: pick.name,
    theme: pick.theme,
    per: String(pick.per),
    sectorAvgPer: String(pick.sectorAvgPer),
    pbr: String(pick.pbr),
    roe: String(pick.roe),
    discountPercent: String(pick.discountPercent),
  });

  if (refresh) params.set("refresh", "true");

  return `/api/undervalued/analysis?${params.toString()}`;
}

export function useUndervaluedAnalysis(
  pick: UndervaluedPick | null,
): UseUndervaluedAnalysisState {
  const [analysis, setAnalysis] = useState<UndervaluedDeepAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [llmAvailable, setLlmAvailable] = useState(false);
  const [cached, setCached] = useState(false);
  const forceRefreshRef = useRef(false);
  const [reloadKey, setReloadKey] = useState(0);

  const refresh = useCallback(() => {
    forceRefreshRef.current = true;
    setReloadKey((value) => value + 1);
  }, []);

  useEffect(() => {
    if (!pick) {
      setAnalysis(null);
      setError(null);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    let cancelled = false;
    const shouldRefresh = forceRefreshRef.current;
    forceRefreshRef.current = false;

    setAnalysis(null);

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(buildAnalysisUrl(pick!, shouldRefresh), {
          signal: controller.signal,
        });

        const data = (await response.json()) as
          | UndervaluedAnalysisApiResponse
          | { error?: string };

        if (!response.ok) {
          throw new Error(
            "error" in data && data.error
              ? data.error
              : "심층 분석을 불러오지 못했습니다.",
          );
        }

        if (cancelled) return;

        const payload = data as UndervaluedAnalysisApiResponse;
        setAnalysis(payload.analysis);
        setLlmAvailable(payload.llmAvailable);
        setCached(payload.cached);
      } catch (fetchError) {
        if (cancelled || (fetchError as Error).name === "AbortError") return;
        setAnalysis(null);
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "심층 분석을 불러오지 못했습니다.",
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [pick, reloadKey]);

  return { analysis, loading, error, llmAvailable, cached, refresh };
}
