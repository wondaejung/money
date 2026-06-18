import { GlobalMacroOverview } from "@/components/macro/GlobalMacroOverview";
import { MacroSensitivitySummary } from "@/components/macro/MacroSensitivitySummary";
import { MacroImpactAnalysis } from "@/components/dashboard/MacroImpactAnalysis";
import { AppLayout } from "@/components/layout/AppLayout";
import { Separator } from "@/components/ui/separator";

export default function MacroImpactPage() {
  return (
    <AppLayout current="macro" title="국제 정세">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-4 sm:gap-8 sm:px-6 sm:py-8">
        <header className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">
            Global Macro Impact
          </p>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            국제 정세 영향도
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
            글로벌 매크로·지정학 이슈가 국내 증시와 내 포트폴리오에 미치는
            영향을 한곳에서 확인합니다.
          </p>
        </header>

        <GlobalMacroOverview />

        <Separator />

        <MacroSensitivitySummary />

        <MacroImpactAnalysis />
      </div>
    </AppLayout>
  );
}
