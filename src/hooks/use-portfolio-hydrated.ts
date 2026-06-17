"use client";

import { useSyncExternalStore } from "react";

import { usePortfolioStore } from "@/store/portfolio-store";

function subscribeHydration(onStoreChange: () => void): () => void {
  const unsubPersist = usePortfolioStore.persist.onFinishHydration(onStoreChange);
  const unsubStore = usePortfolioStore.subscribe((state, prevState) => {
    if (state.hasHydrated !== prevState.hasHydrated) {
      onStoreChange();
    }
  });

  return () => {
    unsubPersist();
    unsubStore();
  };
}

function getHydrationSnapshot(): boolean {
  return usePortfolioStore.getState().hasHydrated;
}

function getServerHydrationSnapshot(): boolean {
  return false;
}

export function usePortfolioHydrated(): boolean {
  return useSyncExternalStore(
    subscribeHydration,
    getHydrationSnapshot,
    getServerHydrationSnapshot,
  );
}
