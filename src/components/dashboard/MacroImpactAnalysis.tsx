"use client";

import Link from "next/link";

import { TrendIndicator } from "@/components/dashboard/TrendIndicator";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { usePortfolio } from "@/hooks/use-portfolio";
import {
  buildMacroImpactHoldings,
  sortByMacroSensitivity,
} from "@/lib/macro-impact";
import type { MacroSensitivity } from "@/types/insights";

const SENSITIVITY_LABEL: Record<MacroSensitivity, string> = {
  high: "높음",
  medium: "보통",
  low: "낮음",
};

const SENSITIVITY_VARIANT: Record<
  MacroSensitivity,
  "destructive" | "default" | "secondary"
> = {
  high: "destructive",
  medium: "default",
  low: "secondary",
};

export function MacroImpactAnalysis() {
  const { holdings, loading } = usePortfolio();
  const macroHoldings = sortByMacroSensitivity(buildMacroImpactHoldings(holdings));

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">보유 종목별 영향도</h2>
        <p className="text-sm text-muted-foreground">
          내 보유 종목만 대상으로 글로벌 이슈 민감도와 대응 힌트를
          진단합니다.
        </p>
      </div>

      {loading && holdings.length === 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {Array.from({ length: 2 }).map((_, index) => (
            <div key={index} className="h-48 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : macroHoldings.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed px-4 py-10 text-center">
          <p className="text-sm text-muted-foreground">
            등록된 보유 종목이 없습니다. 포트폴리오에 종목을 추가하면 매크로
            영향도가 표시됩니다.
          </p>
          <Link
            href="/portfolio"
            className="inline-flex h-8 items-center justify-center rounded-lg border border-border bg-background px-3 text-sm font-medium hover:bg-muted"
          >
            내 포트폴리오에서 종목 추가
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {macroHoldings.map((holding) => (
            <Card key={holding.id} className="border-border/80">
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">
                      {holding.name}{" "}
                      <span className="font-normal text-muted-foreground">
                        ({holding.symbol})
                      </span>
                    </CardTitle>
                    <CardDescription className="mt-1">
                      민감도 점수 {holding.sensitivityScore}
                      <span className="text-muted-foreground/70"> / 100</span>
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant={SENSITIVITY_VARIANT[holding.macroSensitivity]}
                    >
                      영향도 {SENSITIVITY_LABEL[holding.macroSensitivity]}
                    </Badge>
                    <Badge variant="outline">
                      <TrendIndicator trend={holding.trend} className="text-xs" />
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-1.5">
                  {holding.connectedIssues.map((issue) => (
                    <Badge
                      key={issue}
                      variant="secondary"
                      className="font-normal"
                    >
                      {issue}
                    </Badge>
                  ))}
                </div>

                <div className="space-y-2 rounded-lg border bg-muted/30 p-3 text-sm">
                  <p className="font-medium leading-relaxed">
                    {holding.aiComment}
                  </p>
                  <p className="text-muted-foreground">{holding.strategyHint}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
