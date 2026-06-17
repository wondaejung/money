import { UndervaluedValuePicks } from "@/components/undervalued/UndervaluedValuePicks";
import { AppLayout } from "@/components/layout/AppLayout";

export default function UndervaluedPage() {
  return (
    <AppLayout current="undervalued" title="저평가주">
      <UndervaluedValuePicks />
    </AppLayout>
  );
}
