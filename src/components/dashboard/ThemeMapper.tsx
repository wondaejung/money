import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatChangePercent, getChangeTextClass } from "@/lib/market-colors";
import type { ThemeForecast, ThemeImpact } from "@/types/briefing";

const IMPACT_LABEL: Record<ThemeImpact, string> = {
  positive: "긍정",
  negative: "부정",
  neutral: "중립",
};

const IMPACT_VARIANT: Record<
  ThemeImpact,
  "default" | "secondary" | "destructive"
> = {
  positive: "default",
  negative: "destructive",
  neutral: "secondary",
};

interface ThemeMapperProps {
  forecasts: ThemeForecast[];
}

export function ThemeMapper({ forecasts }: ThemeMapperProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>오늘의 국내 테마 예측</CardTitle>
        <CardDescription>
          밤사이 미국 이슈를 한국 증시 테마로 매핑한 예측입니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {forecasts.map((forecast) => (
          <div
            key={forecast.id}
            className="rounded-lg border bg-muted/30 p-4 space-y-3"
          >
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={IMPACT_VARIANT[forecast.impact]}>
                {IMPACT_LABEL[forecast.impact]}
              </Badge>
              <p className="text-sm font-medium">{forecast.krTheme}</p>
            </div>
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">미국 트리거:</span>{" "}
              {forecast.usTrigger}
            </p>
            <div className="flex flex-wrap gap-2">
              {forecast.relatedStocks.map((stock) => (
                <Badge key={stock} variant="outline">
                  {stock}
                </Badge>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

interface UsMarketSummaryProps {
  indices: { name: string; value: number; changePercent: number }[];
  issues: { id: string; title: string; summary: string }[];
}

export function UsMarketSummary({ indices, issues }: UsMarketSummaryProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>미국 증시 요약</CardTitle>
          <CardDescription>뉴욕 3대 지수 마감 현황</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {indices.map((index) => (
            <div
              key={index.name}
              className="flex items-center justify-between rounded-md border px-3 py-2"
            >
              <span className="font-medium">{index.name}</span>
              <div className="text-right">
                <p className="font-mono text-sm">
                  {index.value.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
                <p
                  className={`text-sm font-medium ${getChangeTextClass("US", index.changePercent)}`}
                >
                  {formatChangePercent(index.changePercent)}
                </p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>밤사이 핵심 이슈</CardTitle>
          <CardDescription>오늘 아침 브리핑 상위 3가지</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {issues.map((issue, index) => (
            <div key={issue.id} className="space-y-1 rounded-md border p-3">
              <p className="text-sm font-medium">
                {index + 1}. {issue.title}
              </p>
              <p className="text-sm text-muted-foreground">{issue.summary}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
