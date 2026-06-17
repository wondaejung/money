import { create } from "zustand";
import { persist } from "zustand/middleware";

import { mockUndervaluedPicks } from "@/data/mock-undervalued";
import type {
  UndervaluedPick,
  UndervaluedThemeFilter,
} from "@/types/undervalued";

const KR_UNDERVALUED_PICKS = mockUndervaluedPicks.filter(
  (pick) => pick.market === "KR",
);

interface UndervaluedStore {
  picks: UndervaluedPick[];
  themeFilter: UndervaluedThemeFilter;
  selectedId: string | null;
  setThemeFilter: (filter: UndervaluedThemeFilter) => void;
  selectPick: (id: string | null) => void;
  getFilteredPicks: () => UndervaluedPick[];
  getSelectedPick: () => UndervaluedPick | null;
}

export const useUndervaluedStore = create<UndervaluedStore>()(
  persist(
    (set, get) => ({
      picks: KR_UNDERVALUED_PICKS,
      themeFilter: "all",
      selectedId: KR_UNDERVALUED_PICKS[0]?.id ?? null,

      setThemeFilter: (filter) => {
        const filtered =
          filter === "all"
            ? get().picks
            : get().picks.filter((pick) => pick.theme === filter);

        const currentSelected = get().selectedId;
        const stillVisible = filtered.some((pick) => pick.id === currentSelected);

        set({
          themeFilter: filter,
          selectedId: stillVisible
            ? currentSelected
            : (filtered[0]?.id ?? null),
        });
      },

      selectPick: (id) => set({ selectedId: id }),

      getFilteredPicks: () => {
        const { picks, themeFilter } = get();
        if (themeFilter === "all") return picks;
        return picks.filter((pick) => pick.theme === themeFilter);
      },

      getSelectedPick: () => {
        const { picks, selectedId } = get();
        if (!selectedId) return null;
        return picks.find((pick) => pick.id === selectedId) ?? null;
      },
    }),
    {
      name: "undervalued-value-picks-v1",
      partialize: (state) => ({
        themeFilter: state.themeFilter,
        selectedId: state.selectedId,
      }),
    },
  ),
);
