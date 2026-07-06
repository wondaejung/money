"use client";

import { useState } from "react";

import { Plus, X } from "lucide-react";

import { MacroImpactAnalysis } from "@/components/dashboard/MacroImpactAnalysis";
import { AddPositionForm } from "@/components/portfolio/AddPositionForm";
import { HoldingsTable } from "@/components/portfolio/HoldingsTable";
import { PortfolioBackupTools } from "@/components/portfolio/PortfolioBackupTools";
import { PortfolioSummary } from "@/components/portfolio/PortfolioSummary";
import { SellRecommendations } from "@/components/portfolio/SellRecommendations";
import { Button } from "@/components/ui/button";
import { usePortfolioHydrated } from "@/hooks/use-portfolio-hydrated";
import { useLivePortfolio } from "@/hooks/use-live-portfolio";

export function PortfolioManager() {
  const hydrated = usePortfolioHydrated();
  const [showAddForm, setShowAddForm] = useState(false);
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

  const addFormVisible =
    showAddForm || (hydrated && positions.length === 0);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-4 sm:gap-8 sm:px-6 sm:py-8">
      <header className="space-y-1">
        <p className="text-sm font-medium text-muted-foreground">
          Portfolio Manager
        </p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          내 포트폴리오
        </h1>
      </header>

      {error && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm">
          <p className="text-destructive">{error}</p>
          <Button size="sm" variant="outline" onClick={() => void refresh()}>
            다시 시도
          </Button>
        </div>
      )}

      <PortfolioSummary
        holdings={holdings}
        hydrated={hydrated}
        usdToKrw={usdToKrw}
        fxSource={fxSource}
        fxValid={fxValid}
      />

      <HoldingsTable
        positions={positions}
        holdings={holdings}
        hydrated={hydrated}
        loading={loading}
        error={error}
        priceFlash={priceFlash}
        fetchedAt={fetchedAt}
        fxValid={fxValid}
      />

      <div className="space-y-4">
        {positions.length > 0 && (
          <Button
            variant="outline"
            onClick={() => setShowAddForm((prev) => !prev)}
          >
            {addFormVisible ? (
              <>
                <X className="h-4 w-4" aria-hidden /> 닫기
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" aria-hidden /> 종목 추가
              </>
            )}
          </Button>
        )}
        {addFormVisible && <AddPositionForm />}
      </div>

      <SellRecommendations
        recommendations={sellRecommendations}
        adviceSource={sellAdviceSource}
        llmError={sellAdviceLlmError}
      />
      <MacroImpactAnalysis />
      <PortfolioBackupTools />
    </div>
  );
}
