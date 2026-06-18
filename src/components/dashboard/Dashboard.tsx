import { MarketToneSidebar } from "@/components/dashboard/MarketToneSidebar";
import { MarketToggle } from "@/components/dashboard/MarketToggle";
import { PortfolioHeatmap } from "@/components/dashboard/PortfolioHeatmap";

export function Dashboard() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-4 sm:px-6 sm:py-8">
      <div className="flex flex-col gap-6 sm:gap-8 lg:grid lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start lg:gap-8">
        <div className="flex min-w-0 flex-col gap-6 sm:gap-8">
          <header className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">
              Personal Stock Dashboard
            </p>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              포트폴리오 히트맵
            </h1>
            <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
              보유 종목의 당일 등락과 비중을 한눈에 확인하세요.
            </p>
          </header>

          <MarketToggle />

          <div className="lg:hidden">
            <MarketToneSidebar />
          </div>

          <PortfolioHeatmap />
        </div>

        <aside className="hidden lg:block">
          <div className="sticky top-6">
            <MarketToneSidebar />
          </div>
        </aside>
      </div>
    </div>
  );
}
