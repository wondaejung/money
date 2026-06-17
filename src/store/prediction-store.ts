import { create } from "zustand";
import { persist } from "zustand/middleware";

import {
  formatKstDate,
  shouldResetPrediction,
} from "@/lib/kr-market-time";
import type {
  ClosingBellPrediction,
  TodayAfterHoursSnapshot,
  VerifyPredictionsApiResponse,
} from "@/types/prediction";

interface PredictionStore {
  predictions: ClosingBellPrediction[];
  initialized: boolean;
  initialize: () => void;
  archivePrediction: (id: string) => void;
  purgeExpired: () => void;
  saveSnapshot: (snapshot: TodayAfterHoursSnapshot) => void;
  applyVerification: (
    predictionId: string,
    result: VerifyPredictionsApiResponse,
  ) => void;
}

function createId(): string {
  return `pred-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

function snapshotToPrediction(
  snapshot: TodayAfterHoursSnapshot,
): ClosingBellPrediction {
  return {
    id: createId(),
    krAfterHoursClosedAt: snapshot.krAfterHoursClosedAt,
    targetTradingDate: snapshot.targetTradingDate,
    nextDayMarketClosedAt: null,
    marketSummary: snapshot.marketSummary,
    picks: snapshot.picks,
    verifications: snapshot.picks.map((pick) => ({
      symbol: pick.symbol,
      name: pick.name,
      baselinePrice: pick.afterHoursClosePrice,
      baselineType: "after_hours_close",
      nextDayOpen: null,
      nextDayHigh: null,
      nextDayClose: null,
      maxGainPercent: null,
      outcome: "pending",
      verifiedAt: null,
    })),
    isArchived: false,
    archivedAt: null,
    createdAt: snapshot.krAfterHoursClosedAt,
  };
}

export const usePredictionStore = create<PredictionStore>()(
  persist(
    (set, get) => ({
      predictions: [],
      initialized: false,

      initialize: () => {
        if (get().initialized) return;
        set({ initialized: true });
        get().purgeExpired();
      },

      archivePrediction: (id) => {
        set((state) => ({
          predictions: state.predictions.map((prediction) =>
            prediction.id === id
              ? {
                  ...prediction,
                  isArchived: true,
                  archivedAt: new Date().toISOString(),
                }
              : prediction,
          ),
        }));
      },

      purgeExpired: () => {
        set((state) => {
          const next = state.predictions.filter(
            (prediction) =>
              !shouldResetPrediction(
                prediction.createdAt,
                prediction.isArchived,
              ),
          );
          if (next.length === state.predictions.length) return state;
          return { predictions: next };
        });
      },

      saveSnapshot: (snapshot) => {
        const exists = get().predictions.some(
          (prediction) =>
            prediction.targetTradingDate === snapshot.targetTradingDate,
        );

        if (exists) return;

        set((state) => ({
          predictions: [snapshotToPrediction(snapshot), ...state.predictions],
        }));
      },

      applyVerification: (predictionId, result) => {
        set((state) => ({
          predictions: state.predictions.map((prediction) => {
            if (prediction.id !== predictionId) return prediction;

            const verificationMap = new Map(
              result.verifications.map((item) => [item.symbol, item]),
            );

            return {
              ...prediction,
              verifications: prediction.verifications.map((verification) => {
                const updated = verificationMap.get(verification.symbol);
                return updated ?? verification;
              }),
              nextDayMarketClosedAt: result.nextDayMarketClosedAt,
            };
          }),
        }));
      },
    }),
    { name: "closing-bell-predictions-v1" },
  ),
);

export function getActivePredictions(
  predictions: ClosingBellPrediction[],
): ClosingBellPrediction[] {
  const today = formatKstDate();
  return predictions.filter(
    (prediction) =>
      prediction.isArchived || prediction.targetTradingDate >= today,
  );
}

export function getVerifiablePredictions(
  predictions: ClosingBellPrediction[],
): ClosingBellPrediction[] {
  return [...predictions].sort(
    (a, b) =>
      new Date(b.krAfterHoursClosedAt).getTime() -
      new Date(a.krAfterHoursClosedAt).getTime(),
  );
}
