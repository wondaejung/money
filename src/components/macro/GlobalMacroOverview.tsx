import { Globe } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { globalMacroIssues } from "@/data/global-macro-issues";
import type { MacroSensitivity } from "@/types/insights";

const RISK_LABEL: Record<MacroSensitivity, string> = {
  high: "높음",
  medium: "보통",
  low: "낮음",
};

const RISK_VARIANT: Record<
  MacroSensitivity,
  "destructive" | "default" | "secondary"
> = {
  high: "destructive",
  medium: "default",
  low: "secondary",
};

export function GlobalMacroOverview() {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Globe className="size-5 text-muted-foreground" />
        <div>
          <h2 className="text-xl font-semibold">글로벌 이슈 맵</h2>
          <p className="text-sm text-muted-foreground">
            밤사이 미국·글로벌 매크로 흐름이 한국 증시에 미칠 수 있는 핵심
            테마입니다.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {globalMacroIssues.map((issue) => (
          <Card key={issue.id} className="border-border/80">
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-base">{issue.title}</CardTitle>
                  <CardDescription className="mt-1 font-mono text-xs">
                    {issue.hashtag}
                  </CardDescription>
                </div>
                <Badge variant={RISK_VARIANT[issue.riskLevel]}>
                  리스크 {RISK_LABEL[issue.riskLevel]}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="rounded-lg border bg-muted/30 p-3">
                <p className="text-xs font-medium text-muted-foreground">
                  미국·글로벌 시그널
                </p>
                <p className="mt-1 leading-relaxed">{issue.usSignal}</p>
              </div>
              <div className="rounded-lg border bg-muted/30 p-3">
                <p className="text-xs font-medium text-muted-foreground">
                  국내 증시 영향
                </p>
                <p className="mt-1 leading-relaxed">{issue.krImpact}</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {issue.watchSectors.map((sector) => (
                  <Badge key={sector} variant="outline" className="font-normal">
                    {sector}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
