"use client";

import { useCallback, useEffect, useState } from "react";

import { mockBriefing } from "@/data/mock-briefing";
import type { LlmProvider } from "@/lib/llm-briefing";
import type {
  OvernightIssue,
  ThemeForecast,
  UsIndex,
} from "@/types/briefing";
import type { BriefingApiResponse } from "@/types/quote";

interface BriefingState {
  usIndices: UsIndex[];
  overnightIssues: OvernightIssue[];
  themeForecasts: ThemeForecast[];
  fetchedAt: string | null;
  briefingSource: "llm" | "mock";
  llmProvider: LlmProvider | null;
  llmError: string | null;
  loading: boolean;
  error: string | null;
}

export function useBriefing() {
  const [state, setState] = useState<BriefingState>({
    usIndices: mockBriefing.usIndices,
    overnightIssues: mockBriefing.overnightIssues,
    themeForecasts: mockBriefing.themeForecasts,
    fetchedAt: null,
    briefingSource: "mock",
    llmProvider: null,
    llmError: null,
    loading: true,
    error: null,
  });

  const load = useCallback(async (options?: { refresh?: boolean }) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const url = options?.refresh
        ? "/api/briefing?refresh=true"
        : "/api/briefing";
      const response = await fetch(url, { cache: "no-store" });

      if (!response.ok) {
        throw new Error("브리핑 데이터 로드 실패");
      }

      const data = (await response.json()) as BriefingApiResponse;

      setState({
        usIndices: data.usIndices,
        overnightIssues: data.overnightIssues,
        themeForecasts: data.themeForecasts,
        fetchedAt: data.fetchedAt,
        briefingSource: data.briefingSource,
        llmProvider: data.llmProvider ?? null,
        llmError: data.llmError ?? null,
        loading: false,
        error: null,
      });
    } catch (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error:
          error instanceof Error ? error.message : "브리핑 데이터 로드 실패",
      }));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const refresh = useCallback(() => load({ refresh: true }), [load]);

  return { ...state, refresh };
}
