import { PortfolioManager } from "@/components/portfolio/PortfolioManager";
import { AppNav } from "@/components/layout/AppNav";

export default function PortfolioPage() {
  return (
    <main className="min-h-screen bg-background">
      <AppNav current="portfolio" />
      <PortfolioManager />
    </main>
  );
}
