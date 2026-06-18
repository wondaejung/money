"use client";

import { useMemo } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePortfolio } from "@/hooks/use-portfolio";
import {
  buildMacroImpactHoldings,
  sortByMacroSensitivity,
} from "@/lib/macro-impact";
import type { MacroSensitivity } from "@/types/insights";

const LABEL: Record<MacroSensitivity, string> = {
  high: "높음",
  medium: "보통",
  low: "낮음",
};

export function MacroSensitivitySummary() {
  const { holdings, loading } = usePortfolio();

  const summary = useMemo(() => {
    const items = sortByMacroSensitivity(buildMacroImpactHoldings(holdings));
    const counts: Record<MacroSensitivity, number> = {
      high: 0,
      medium: 0,
      low: 0,
    };
    for (const item of items) {
      counts[item.macroSensitivity] += 1;
    }
    const avgScore =
      items.length === 0
        ? 0
        : Math.round(
            items.reduce((sum, item) => sum + item.sensitivityScore, 0) /
              items.length,
          );
    return { items, counts, avgScore };
  }, [holdings]);

  if (loading && holdings.length === 0) {
    return <div className="h-28 animate-pulse rounded-xl bg-muted" />;
  }

  if (summary.items.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            분석 종목
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold">{summary.items.length}개</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            평균 민감도
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold">{summary.avgScore}</p>
          <p className="text-xs text-muted-foreground">/ 100</p>
        </CardContent>
      </Card>
      <Card className="sm:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            영향도 분포
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {(Object.keys(summary.counts) as MacroSensitivity[]).map((level) => (
            <Badge
              key={level}
              variant={level === "high" ? "destructive" : level === "medium" ? "default" : "secondary"}
            >
              {LABEL[level]} {summary.counts[level]}종목
            </Badge>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
