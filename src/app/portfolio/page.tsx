import { PortfolioManager } from "@/components/portfolio/PortfolioManager";
import { AppLayout } from "@/components/layout/AppLayout";

export default function PortfolioPage() {
  return (
    <AppLayout current="portfolio" title="설정">
      <PortfolioManager />
    </AppLayout>
  );
}
