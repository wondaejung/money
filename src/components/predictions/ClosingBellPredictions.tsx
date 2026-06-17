import { AfterHoursTopPredictions } from "@/components/predictions/AfterHoursTopPredictions";
import { PredictionAccuracyTracker } from "@/components/predictions/PredictionAccuracyTracker";
import { Separator } from "@/components/ui/separator";

export function ClosingBellPredictions() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-4 sm:gap-8 sm:px-6 sm:py-8">
      <header className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">
          Closing-Bell Predictions
        </p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          종가 베팅 AI 예측 및 검증
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
          한국 시간외 단일가 마감(오후 6시) 데이터로 다음 거래일 개장 강세
          종목을 예측하고, 장 마감 후 적중률을 검증합니다.
        </p>
      </header>

      <AfterHoursTopPredictions />

      <Separator />

      <PredictionAccuracyTracker />
    </div>
  );
}
