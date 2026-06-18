"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";

import { usePortfolioCloudSync } from "@/hooks/use-portfolio-cloud-sync";
import { useDailyReportStore } from "@/store/daily-report-store";
import { usePortfolioStore } from "@/store/portfolio-store";
import { usePredictionStore } from "@/store/prediction-store";
import { useUndervaluedStore } from "@/store/undervalued-store";

export function StoreProvider({ children }: { children: ReactNode }) {
  usePortfolioCloudSync();

  useEffect(() => {
    void usePortfolioStore.persist.rehydrate();
    void usePredictionStore.persist.rehydrate();
    void useUndervaluedStore.persist.rehydrate();
    void useDailyReportStore.persist.rehydrate();

    const fallback = window.setTimeout(() => {
      if (!usePortfolioStore.getState().hasHydrated) {
        usePortfolioStore.getState().setHasHydrated(true);
      }
    }, 1500);

    return () => window.clearTimeout(fallback);
  }, []);

  return children;
}
