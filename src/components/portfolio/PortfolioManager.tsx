"use client";

import { AddPositionForm } from "@/components/portfolio/AddPositionForm";
import { HoldingsTable } from "@/components/portfolio/HoldingsTable";
import { LossHoldingsSummary } from "@/components/portfolio/LossHoldingsSummary";
import { PortfolioBackupTools } from "@/components/portfolio/PortfolioBackupTools";
import { SellRecommendations } from "@/components/portfolio/SellRecommendations";
import { Button } from "@/components/ui/button";
import { usePortfolioHydrated } from "@/hooks/use-portfolio-hydrated";
import { useLivePortfolio } from "@/hooks/use-live-portfolio";

export function PortfolioManager() {
  const hydrated = usePortfolioHydrated();
  const {
    holdings,
    sellRecommendations,
    sellAdviceSource,
    sellAdviceLlmError,
    loading,
    error,
    priceFlash,
    fetchedAt,
    usdToKrw,
    fxSource,
    fxValid,
    refresh,
    positions,
  } = useLivePortfolio();

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6">
      <header className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">
          Portfolio Manager
        </p>
        <h1 className="text-3xl font-bold tracking-tight">내 포트폴리오</h1>
        <p className="max-w-2xl text-muted-foreground">
          매수가와 수량을 입력하면 실시간 시세·당일 차트 흐름·판매 추천을
          확인할 수 있습니다.
        </p>
      </header>

      {error && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm">
          <p className="text-destructive">{error}</p>
          <Button size="sm" variant="outline" onClick={() => void refresh()}>
            다시 시도
          </Button>
        </div>
      )}

      <AddPositionForm />
      <HoldingsTable
        positions={positions}
        holdings={holdings}
        hydrated={hydrated}
        loading={loading}
        error={error}
        priceFlash={priceFlash}
        fetchedAt={fetchedAt}
        usdToKrw={usdToKrw}
        fxSource={fxSource}
        fxValid={fxValid}
      />
      <LossHoldingsSummary holdings={holdings} />
      <SellRecommendations
        recommendations={sellRecommendations}
        adviceSource={sellAdviceSource}
        llmError={sellAdviceLlmError}
      />
      <PortfolioBackupTools />
    </div>
  );
}
