import { DailyMarketReport } from "@/components/report/DailyMarketReport";
import { MorningBriefing } from "@/components/dashboard/MorningBriefing";
import { AppLayout } from "@/components/layout/AppLayout";
import { Separator } from "@/components/ui/separator";

export default function ReportPage() {
  return (
    <AppLayout current="report" title="일일 보고서">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-4 sm:gap-8 sm:px-6 sm:py-8">
        <header className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">
            Daily Market Report
          </p>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            일일 보고서
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
            당일 국내 증시 핵심 이슈와 포트폴리오 영향도를 확인하고, 미국
            증시 모닝 브리핑도 함께 볼 수 있습니다.
          </p>
        </header>

        <DailyMarketReport />

        <Separator />

        <MorningBriefing />
      </div>
    </AppLayout>
  );
}
