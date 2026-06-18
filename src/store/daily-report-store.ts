import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { DailyMarketReport } from "@/types/daily-report";

interface DailyReportStore {
  report: DailyMarketReport | null;
  targetDate: string | null;
  setReport: (report: DailyMarketReport) => void;
  clearIfStale: (sessionDate: string) => void;
}

export const useDailyReportStore = create<DailyReportStore>()(
  persist(
    (set, get) => ({
      report: null,
      targetDate: null,

      setReport: (report) => {
        set({ report, targetDate: report.targetDate });
      },

      clearIfStale: (sessionDate) => {
        const { targetDate } = get();
        if (targetDate && targetDate !== sessionDate) {
          set({ report: null, targetDate: null });
        }
      },
    }),
    { name: "daily-market-report-v1" },
  ),
);

export function hasCachedReportForDate(
  report: DailyMarketReport | null,
  targetDate: string | null,
  sessionDate: string,
): boolean {
  return Boolean(
    report && targetDate === sessionDate && report.targetDate === sessionDate,
  );
}
