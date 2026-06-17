"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

import { usePortfolioStore } from "@/store/portfolio-store";
import type { UserPosition } from "@/types/portfolio";

const SAVE_DEBOUNCE_MS = 1200;

function resolvePositions(
  local: UserPosition[],
  server: UserPosition[],
): UserPosition[] {
  if (server.length === 0) return local;
  if (local.length === 0) return server;
  return server.length >= local.length ? server : local;
}

async function fetchServerPositions(): Promise<UserPosition[] | null> {
  const response = await fetch("/api/portfolio/saved", {
    method: "GET",
    credentials: "same-origin",
  });

  if (response.status === 401) return null;
  if (!response.ok) return [];

  const data = (await response.json()) as { positions?: UserPosition[] };
  return Array.isArray(data.positions) ? data.positions : [];
}

async function saveServerPositions(positions: UserPosition[]): Promise<boolean> {
  const response = await fetch("/api/portfolio/saved", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ positions }),
  });
  return response.ok;
}

export function usePortfolioCloudSync() {
  const pathname = usePathname();
  const hasHydrated = usePortfolioStore((s) => s.hasHydrated);

  const syncReadyRef = useRef(false);
  const lastSavedRef = useRef<string>("");
  const saveTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!hasHydrated || pathname === "/login") return;

    let cancelled = false;
    syncReadyRef.current = false;

    async function pullFromServer() {
      try {
        const serverPositions = await fetchServerPositions();

        if (cancelled) return;

        if (serverPositions === null) {
          return;
        }

        const localPositions = usePortfolioStore.getState().positions;
        const merged = resolvePositions(localPositions, serverPositions);

        if (JSON.stringify(merged) !== JSON.stringify(localPositions)) {
          usePortfolioStore.getState().replacePositions(merged);
        }

        if (serverPositions.length === 0 && localPositions.length > 0) {
          await saveServerPositions(localPositions);
        }

        lastSavedRef.current = JSON.stringify(
          usePortfolioStore.getState().positions,
        );
      } finally {
        if (!cancelled) {
          syncReadyRef.current = true;
        }
      }
    }

    void pullFromServer();

    return () => {
      cancelled = true;
      syncReadyRef.current = false;
    };
  }, [hasHydrated, pathname]);

  useEffect(() => {
    if (!hasHydrated || pathname === "/login") return;

    const unsubscribe = usePortfolioStore.subscribe((state) => {
      if (!syncReadyRef.current) return;

      const serialized = JSON.stringify(state.positions);
      if (serialized === lastSavedRef.current) return;

      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
      }

      saveTimerRef.current = window.setTimeout(() => {
        void saveServerPositions(usePortfolioStore.getState().positions).then(
          (ok) => {
            if (ok) {
              lastSavedRef.current = JSON.stringify(
                usePortfolioStore.getState().positions,
              );
            }
          },
        );
      }, SAVE_DEBOUNCE_MS);
    });

    return () => {
      unsubscribe();
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
      }
    };
  }, [hasHydrated, pathname]);
}
