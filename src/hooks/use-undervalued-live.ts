"use client";

import { useCallback, useEffect, useState } from "react";

import { useUndervaluedStore } from "@/store/undervalued-store";
import type { UndervaluedPick } from "@/types/undervalued";

const REFRESH_MS = 60_000;

interface UndervaluedLiveResponse {
  picks: UndervaluedPick[];
  fetchedAt: string;
  source: "naver";
  error?: string;
}

export function useUndervaluedLive() {
  const setPicks = useUndervaluedStore((state) => state.setPicks);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [source, setSource] = useState<"naver" | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/undervalued", { cache: "no-store" });
      const data = (await response.json()) as UndervaluedLiveResponse;

      if (!response.ok) {
        throw new Error(data.error ?? "네이버 시세를 불러오지 못했습니다.");
      }

      setPicks(data.picks);
      setFetchedAt(data.fetchedAt);
      setSource(data.source);
    } catch (fetchError) {
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "네이버 시세를 불러오지 못했습니다.",
      );
    } finally {
      setLoading(false);
    }
  }, [setPicks]);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => {
      void refresh();
    }, REFRESH_MS);

    return () => window.clearInterval(timer);
  }, [refresh]);

  return { loading, error, fetchedAt, source, refresh };
}
