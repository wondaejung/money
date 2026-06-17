"use client";

import { useEffect, useRef } from "react";

import { usePortfolioStore } from "@/store/portfolio-store";
import type { UserPosition } from "@/types/portfolio";

const SAVE_DEBOUNCE_MS = 1200;

export function usePortfolioCloudSync() {
  const hasHydrated = usePortfolioStore((s) => s.hasHydrated);

  const initializedRef = useRef(false);
  const lastSavedRef = useRef<string>("");
  const saveTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!hasHydrated) return;
    if (initializedRef.current) return;
    initializedRef.current = true;

    const abort = new AbortController();

    async function init() {
      try {
        const response = await fetch("/api/portfolio/saved", {
          method: "GET",
          credentials: "same-origin",
          signal: abort.signal,
        });
        if (!response.ok) return;

        const data = (await response.json()) as { positions?: UserPosition[] };
        const serverPositions = Array.isArray(data.positions) ? data.positions : [];

        const localPositions = usePortfolioStore.getState().positions;
        if (localPositions.length === 0 && serverPositions.length > 0) {
          usePortfolioStore.getState().replacePositions(serverPositions);
        }

        lastSavedRef.current = JSON.stringify(usePortfolioStore.getState().positions);
      } catch {
        // ignore
      }
    }

    void init();

    return () => abort.abort();
  }, [hasHydrated]);

  useEffect(() => {
    if (!hasHydrated) return;

    const unsubscribe = usePortfolioStore.subscribe((state) => {
      const serialized = JSON.stringify(state.positions);
      if (serialized === lastSavedRef.current) return;

      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
      }

      saveTimerRef.current = window.setTimeout(() => {
        void fetch("/api/portfolio/saved", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ positions: usePortfolioStore.getState().positions }),
        }).then((res) => {
          if (res.ok) {
            lastSavedRef.current = JSON.stringify(
              usePortfolioStore.getState().positions,
            );
          }
        });
      }, SAVE_DEBOUNCE_MS);
    });

    return () => {
      unsubscribe();
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
      }
    };
  }, [hasHydrated]);
}

