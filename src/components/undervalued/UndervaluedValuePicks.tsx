import { AiCatalystAnalysis } from "@/components/undervalued/AiCatalystAnalysis";
import { UndervaluedTop10 } from "@/components/undervalued/UndervaluedTop10";
import { Separator } from "@/components/ui/separator";

export function UndervaluedValuePicks() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6">
      <header className="space-y-2">
        <p className="text-sm font-medium text-violet-600">
          Undervalued Value Picks
        </p>
        <h1 className="text-3xl font-bold tracking-tight">
          저평가 밸류 픽 TOP 10
        </h1>
        <p className="max-w-2xl text-muted-foreground">
          코스피·코스닥 종목만 대상으로 밸류에이션 지표를 스크리닝하고, AI가
          밸류 트랩을 걸러낸 뒤 반등 타이밍을 예측합니다.
        </p>
      </header>

      <UndervaluedTop10 />

      <Separator />

      <AiCatalystAnalysis />
    </div>
  );
}
