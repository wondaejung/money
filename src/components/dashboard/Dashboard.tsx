import { MacroImpactAnalysis } from "@/components/dashboard/MacroImpactAnalysis";
import { MarketToneSidebar } from "@/components/dashboard/MarketToneSidebar";
import { MarketToggle } from "@/components/dashboard/MarketToggle";
import { MorningBriefing } from "@/components/dashboard/MorningBriefing";
import { PortfolioHeatmap } from "@/components/dashboard/PortfolioHeatmap";
import { UndervaluedSectorFinder } from "@/components/dashboard/UndervaluedSectorFinder";
import { Separator } from "@/components/ui/separator";

export function Dashboard() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-8 xl:grid xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start xl:gap-8">
        <div className="flex min-w-0 flex-col gap-8">
          <header className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">
              Personal Stock Dashboard
            </p>
            <h1 className="text-3xl font-bold tracking-tight">주식 대시보드</h1>
            <p className="max-w-2xl text-muted-foreground">
              코스피·코스닥 포트폴리오를 한눈에 보고, 밤사이 미국 증시 이슈가 오늘
              국내 테마에 미칠 영향을 확인하세요.
            </p>
          </header>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <MarketToggle />
            <p className="text-xs text-muted-foreground">
              KR 상승=적색 · 하락=청색
            </p>
          </div>

          <div className="xl:hidden">
            <MarketToneSidebar />
          </div>

          <PortfolioHeatmap />

          <Separator />

          <MacroImpactAnalysis />

          <Separator />

          <UndervaluedSectorFinder />

          <Separator />

          <MorningBriefing />
        </div>

        <aside className="hidden xl:block">
          <div className="sticky top-6">
            <MarketToneSidebar />
          </div>
        </aside>
      </div>
    </div>
  );
}
