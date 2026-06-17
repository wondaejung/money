import { ClosingBellPredictions } from "@/components/predictions/ClosingBellPredictions";
import { AppLayout } from "@/components/layout/AppLayout";

export default function PredictionsPage() {
  return (
    <AppLayout current="predictions" title="종가 베팅">
      <ClosingBellPredictions />
    </AppLayout>
  );
}
