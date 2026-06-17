import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { portfolioPersistStorage } from "@/lib/portfolio-storage";
import type { UserPosition } from "@/types/portfolio";

interface PortfolioStore {
  positions: UserPosition[];
  hasHydrated: boolean;
  setHasHydrated: (value: boolean) => void;
  addPosition: (position: Omit<UserPosition, "id" | "createdAt">) => void;
  updatePosition: (id: string, updates: Partial<UserPosition>) => void;
  removePosition: (id: string) => void;
  replacePositions: (positions: UserPosition[]) => void;
  mergePositions: (positions: UserPosition[]) => void;
}

function createId(): string {
  return `pos-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export const usePortfolioStore = create<PortfolioStore>()(
  persist(
    (set) => ({
      positions: [],
      hasHydrated: false,
      setHasHydrated: (value) => set({ hasHydrated: value }),

      addPosition: (position) =>
        set((state) => ({
          positions: [
            ...state.positions,
            {
              ...position,
              id: createId(),
              createdAt: new Date().toISOString(),
            },
          ],
        })),
      updatePosition: (id, updates) =>
        set((state) => ({
          positions: state.positions.map((position) =>
            position.id === id ? { ...position, ...updates } : position,
          ),
        })),
      removePosition: (id) =>
        set((state) => ({
          positions: state.positions.filter((position) => position.id !== id),
        })),
      replacePositions: (positions) => set({ positions }),
      mergePositions: (incoming) =>
        set((state) => {
          const existingSymbols = new Set(
            state.positions.map((position) => position.symbol),
          );
          const merged = [
            ...state.positions,
            ...incoming.filter((position) => !existingSymbols.has(position.symbol)),
          ];
          return { positions: merged };
        }),
    }),
    {
      name: "stock-portfolio-v1",
      skipHydration: true,
      storage: createJSONStorage(() => portfolioPersistStorage),
      partialize: (state) => ({ positions: state.positions }),
      onRehydrateStorage: () => (_state, error) => {
        if (error) {
          console.error("포트폴리오 저장소 복원 실패:", error);
        }
        usePortfolioStore.getState().setHasHydrated(true);
      },
    },
  ),
);
