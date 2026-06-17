"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { mockInsights } from "@/data/mock-insights";
import type { BlindSpotSector, UndervaluedStock } from "@/types/insights";

interface UndervaluedSectorFinderProps {
  sectors?: BlindSpotSector[];
}

function formatMetric(value: number | null, suffix = ""): string {
  if (value === null) return "—";
  return `${value.toFixed(1)}${suffix}`;
}

function StockRow({ stock }: { stock: UndervaluedStock }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border bg-background/60 p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium">
            {stock.name}{" "}
            <span className="text-sm font-normal text-muted-foreground">
              {stock.symbol}
            </span>
          </p>
          <Badge variant="outline" className="text-[10px]">
            {stock.market}
          </Badge>
          {stock.isOwned && (
            <Badge variant="secondary" className="text-[10px]">
              보유 중
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">{stock.reason}</p>
      </div>
      <div className="flex shrink-0 flex-wrap gap-3 text-xs text-muted-foreground sm:text-right">
        <span>PER {formatMetric(stock.per)}</span>
        <span>PBR {formatMetric(stock.pbr)}</span>
        {stock.discountPercent !== null && (
          <span className="font-medium text-red-500">
            할인 {stock.discountPercent}%
          </span>
        )}
      </div>
    </div>
  );
}

export function UndervaluedSectorFinder({
  sectors = mockInsights.blindSpotSectors.filter(
    (sector) => sector.market === "KR",
  ),
}: UndervaluedSectorFinderProps) {
  const blindSpots = sectors.filter(
    (sector) => !sector.isOwned || sector.portfolioWeightPercent < 5,
  );

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">저평가 섹터 & 종목 추천</h2>
          <p className="text-sm text-muted-foreground">
            포트폴리오 사각지대 섹터를 찾고, 시장 대비 저평가된 국내 종목을
            스크리닝합니다.
          </p>
        </div>
        <Link
          href="/undervalued"
          className="inline-flex h-8 shrink-0 items-center justify-center rounded-lg border border-border bg-background px-3 text-sm font-medium hover:bg-muted"
        >
          밸류 픽 TOP 10 보기
        </Link>
      </div>

      <div className="space-y-4">
        {blindSpots.map((sector) => (
          <Card key={sector.id} className="border-border/80">
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-start gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="size-4" aria-hidden />
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="text-base">{sector.sector}</CardTitle>
                    <Badge variant="outline">{sector.market}</Badge>
                    <Badge
                      variant={
                        sector.portfolioWeightPercent === 0
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      비중 {sector.portfolioWeightPercent}%
                    </Badge>
                  </div>
                  <CardDescription className="text-sm leading-relaxed text-foreground/80">
                    {sector.insight}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                추천 종목
              </p>
              {sector.recommendations.map((stock) => (
                <StockRow key={`${sector.id}-${stock.symbol}`} stock={stock} />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
