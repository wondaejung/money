import { AppLayout } from "@/components/layout/AppLayout";
import { ExpertOpinionView } from "@/components/expert/ExpertOpinionView";

export default function ExpertPage() {
  return (
    <AppLayout current="expert" title="전문가 의견">
      <ExpertOpinionView />
    </AppLayout>
  );
}
