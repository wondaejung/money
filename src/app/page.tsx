import { Dashboard } from "@/components/dashboard/Dashboard";
import { AppLayout } from "@/components/layout/AppLayout";

export default function Home() {
  return (
    <AppLayout current="dashboard" title="히트맵">
      <Dashboard />
    </AppLayout>
  );
}
