import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  formatChangePercent,
  getChangeTextClass,
} from "@/lib/market-colors";
import type { SellActionType, SellRecommendation } from "@/types/portfolio";

const URGENCY_LABEL = {
  high: "강력 추천",
  medium: "검토 권장",
  low: "관심",
} as const;

const URGENCY_VARIANT = {
  high: "destructive",
  medium: "default",
  low: "secondary",
} as const;

const ACTION_VARIANT: Record<
  SellActionType,
  "destructive" | "default" | "secondary" | "outline"
> = {
  stop_loss: "destructive",
  decline_review: "default",
  take_profit: "outline",
};

interface SellRecommendationsProps {
  recommendations: SellRecommendation[];
  adviceSource?: "llm" | "rule";
  llmError?: string;
}

function formatPrice(value: number, market: string): string {
  if (market === "KR") return `${Math.round(value).toLocaleString()}원`;
  return `$${value.toFixed(2)}`;
}

export function SellRecommendations({
  recommendations,
  adviceSource,
  llmError,
}: SellRecommendationsProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>판매 추천</CardTitle>
            <CardDescription>
              수익률·당일 흐름을 기준으로 검토 종목을 선별하고, LLM이 당일
              맥락과 추세를 한 줄로 설명합니다. (투자 참고용)
            </CardDescription>
          </div>
          {adviceSource === "llm" && (
            <Badge variant="secondary">AI 조언</Badge>
          )}
        </div>
        {llmError && (
          <p className="text-xs text-amber-600">
            AI 조언 생성 실패 — 규칙 기반 설명으로 대체됨 ({llmError})
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {recommendations.length === 0 ? (
          <p className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
            현재 판매 추천 대상 종목이 없습니다.
          </p>
        ) : (
          recommendations.map((rec) => (
            <div
              key={rec.holdingId}
              className="space-y-2 rounded-lg border bg-muted/30 p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={URGENCY_VARIANT[rec.urgency]}>
                  {URGENCY_LABEL[rec.urgency]}
                </Badge>
                <Badge variant={ACTION_VARIANT[rec.action]}>
                  {rec.headline}
                </Badge>
                <p className="font-medium">
                  {rec.name}{" "}
                  <span className="text-muted-foreground">({rec.symbol})</span>
                </p>
              </div>

              <div className="space-y-1 text-sm">
                <p className="text-muted-foreground">{rec.reason}</p>
                {rec.llmReason && (
                  <p className="font-medium leading-relaxed">{rec.llmReason}</p>
                )}
                {rec.upsideNote && (
                  <p className="text-emerald-600 dark:text-emerald-400">
                    {rec.upsideNote}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                <span>
                  매수가 {formatPrice(rec.purchasePrice, rec.market)}
                </span>
                <span>
                  현재가 {formatPrice(rec.currentPrice, rec.market)}
                </span>
                <span
                  className={getChangeTextClass(rec.market, rec.gainPercent)}
                >
                  총 수익률 {formatChangePercent(rec.gainPercent)}
                </span>
                <span
                  className={getChangeTextClass(rec.market, rec.changePercent)}
                >
                  당일 {formatChangePercent(rec.changePercent)}
                </span>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
