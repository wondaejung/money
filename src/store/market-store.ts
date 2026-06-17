import { create } from "zustand";

import type { MarketFilter } from "@/types/market";

interface MarketStore {
  marketFilter: MarketFilter;
  setMarketFilter: (filter: MarketFilter) => void;
}

export const useMarketStore = create<MarketStore>((set) => ({
  marketFilter: "KR",
  setMarketFilter: (filter) => set({ marketFilter: filter }),
}));
