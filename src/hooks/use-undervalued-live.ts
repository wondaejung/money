"use client";

import { useCallback, useEffect, useState } from "react";

import { useUndervaluedStore } from "@/store/undervalued-store";
import type { UndervaluedPick } from "@/types/undervalued";

const REFRESH_MS = 60_000;
const LEGACY_STORAGE_KEY = "undervalued-value-picks-v1";

interface UndervaluedLiveResponse {
  picks: UndervaluedPick[];
  fetchedAt: string;
  source: "naver";
  error?: string;
}

function isLivePick(pick: UndervaluedPick): boolean {
  return Boolean(pick.fetchedAt && pick.priceSource === "naver");
}

export function useUndervaluedLive() {
  const setPicks = useUndervaluedStore((state) => state.setPicks);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [source, setSource] = useState<"naver" | null>(null);
  const [liveReady, setLiveReady] = useState(false);

  const refresh = useCallback(
    async (options?: { force?: boolean }) => {
      setLoading(true);
      setError(null);
      setLiveReady(false);
      setPicks([]);

      try {
        const query = options?.force ? "?refresh=true" : "";
        const response = await fetch(`/api/undervalued${query}`, {
          cache: "no-store",
        });
        const data = (await response.json()) as UndervaluedLiveResponse;

        if (!response.ok) {
          throw new Error(data.error ?? "네이버 시세를 불러오지 못했습니다.");
        }

        const livePicks = data.picks.filter(isLivePick);
        if (livePicks.length === 0) {
          throw new Error("네이버 실시간 시세가 포함된 종목이 없습니다.");
        }

        setPicks(livePicks);
        setFetchedAt(data.fetchedAt);
        setSource(data.source);
        setLiveReady(true);
      } catch (fetchError) {
        setPicks([]);
        setLiveReady(false);
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "네이버 시세를 불러오지 못했습니다.",
        );
      } finally {
        setLoading(false);
      }
    },
    [setPicks],
  );

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(LEGACY_STORAGE_KEY);
    }

    void refresh({ force: true });

    const timer = window.setInterval(() => {
      void refresh();
    }, REFRESH_MS);

    return () => window.clearInterval(timer);
  }, [refresh]);

  return { loading, error, fetchedAt, source, liveReady, refresh };
}
