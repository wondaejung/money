import { ClosingBellPredictions } from "@/components/predictions/ClosingBellPredictions";
import { AppNav } from "@/components/layout/AppNav";

export default function PredictionsPage() {
  return (
    <main className="min-h-screen bg-background">
      <AppNav current="predictions" />
      <ClosingBellPredictions />
    </main>
  );
}
