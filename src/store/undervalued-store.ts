import { create } from "zustand";
import { persist } from "zustand/middleware";

import type {
  UndervaluedPick,
  UndervaluedTheme,
  UndervaluedThemeFilter,
} from "@/types/undervalued";

const UNDERVALUED_THEMES: UndervaluedTheme[] = [
  "semiconductor",
  "bio",
  "battery",
  "auto",
  "finance",
  "platform",
];

export const EMPTY_PICKS_BY_THEME: Record<UndervaluedTheme, UndervaluedPick[]> = {
  semiconductor: [],
  bio: [],
  battery: [],
  auto: [],
  finance: [],
  platform: [],
};

export interface UndervaluedPicksPayload {
  allPicks: UndervaluedPick[];
  picksByTheme: Record<UndervaluedTheme, UndervaluedPick[]>;
}

export function getDisplayedPicks(
  { allPicks, picksByTheme }: UndervaluedPicksPayload,
  themeFilter: UndervaluedThemeFilter,
): UndervaluedPick[] {
  if (themeFilter === "all") return allPicks;
  return picksByTheme[themeFilter] ?? [];
}

export function getAllStoredPicks(
  picksByTheme: Record<UndervaluedTheme, UndervaluedPick[]>,
): UndervaluedPick[] {
  const seen = new Set<string>();
  const merged: UndervaluedPick[] = [];

  for (const theme of UNDERVALUED_THEMES) {
    for (const pick of picksByTheme[theme] ?? []) {
      if (seen.has(pick.id)) continue;
      seen.add(pick.id);
      merged.push(pick);
    }
  }

  return merged;
}

interface UndervaluedStore {
  allPicks: UndervaluedPick[];
  picksByTheme: Record<UndervaluedTheme, UndervaluedPick[]>;
  themeFilter: UndervaluedThemeFilter;
  selectedId: string | null;
  setPicks: (payload: UndervaluedPicksPayload) => void;
  setThemeFilter: (filter: UndervaluedThemeFilter) => void;
  selectPick: (id: string | null) => void;
  getDisplayedPicks: () => UndervaluedPick[];
  getSelectedPick: () => UndervaluedPick | null;
}

export const useUndervaluedStore = create<UndervaluedStore>()(
  persist(
    (set, get) => ({
      allPicks: [],
      picksByTheme: EMPTY_PICKS_BY_THEME,
      themeFilter: "all",
      selectedId: null,

      setPicks: (payload) => {
        const { themeFilter, selectedId } = get();
        const displayed = getDisplayedPicks(payload, themeFilter);
        const stillVisible = displayed.some((pick) => pick.id === selectedId);

        set({
          allPicks: payload.allPicks,
          picksByTheme: payload.picksByTheme,
          selectedId: stillVisible ? selectedId : (displayed[0]?.id ?? null),
        });
      },

      setThemeFilter: (filter) => {
        const payload = {
          allPicks: get().allPicks,
          picksByTheme: get().picksByTheme,
        };
        const displayed = getDisplayedPicks(payload, filter);
        const currentSelected = get().selectedId;
        const stillVisible = displayed.some((pick) => pick.id === currentSelected);

        set({
          themeFilter: filter,
          selectedId: stillVisible
            ? currentSelected
            : (displayed[0]?.id ?? null),
        });
      },

      selectPick: (id) => set({ selectedId: id }),

      getDisplayedPicks: () =>
        getDisplayedPicks(
          {
            allPicks: get().allPicks,
            picksByTheme: get().picksByTheme,
          },
          get().themeFilter,
        ),

      getSelectedPick: () => {
        const { selectedId, picksByTheme } = get();
        if (!selectedId) return null;
        return (
          getAllStoredPicks(picksByTheme).find((pick) => pick.id === selectedId) ??
          null
        );
      },
    }),
    {
      name: "undervalued-value-picks-v4",
      partialize: (state) => ({
        themeFilter: state.themeFilter,
        selectedId: state.selectedId,
      }),
    },
  ),
);
