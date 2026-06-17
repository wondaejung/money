import { UndervaluedValuePicks } from "@/components/undervalued/UndervaluedValuePicks";
import { AppNav } from "@/components/layout/AppNav";

export default function UndervaluedPage() {
  return (
    <main className="min-h-screen bg-background">
      <AppNav current="undervalued" />
      <UndervaluedValuePicks />
    </main>
  );
}
