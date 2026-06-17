import { Dashboard } from "@/components/dashboard/Dashboard";
import { AppNav } from "@/components/layout/AppNav";

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <AppNav current="dashboard" />
      <Dashboard />
    </main>
  );
}
