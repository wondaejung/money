"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatChangePercent, getChangeTextClass } from "@/lib/market-colors";
import { usePortfolioStore } from "@/store/portfolio-store";
import type { ResolvedStock } from "@/lib/resolve-stock";

function formatPrice(value: number, currency: string): string {
  if (currency === "KRW") return `${Math.round(value).toLocaleString()}원`;
  return `$${value.toFixed(2)}`;
}

export function AddPositionForm() {
  const addPosition = usePortfolioStore((state) => state.addPosition);

  const [stockName, setStockName] = useState("");
  const [shares, setShares] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [resolved, setResolved] = useState<ResolvedStock | null>(null);
  const [resolving, setResolving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const query = stockName.trim();
    if (query.length < 2) {
      setResolved(null);
      return;
    }

    const timer = window.setTimeout(async () => {
      setResolving(true);
      setError(null);

      try {
        const response = await fetch("/api/resolve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: query }),
        });

        if (!response.ok) {
          setResolved(null);
          return;
        }

        const data = (await response.json()) as ResolvedStock;
        setResolved(data);
      } catch {
        setResolved(null);
      } finally {
        setResolving(false);
      }
    }, 400);

    return () => window.clearTimeout(timer);
  }, [stockName]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const shareCount = Number(shares);
    const buyPrice = Number(purchasePrice);
    const query = stockName.trim();

    if (!query) {
      setError("종목명을 입력하세요.");
      return;
    }

    if (!shareCount || shareCount <= 0 || !buyPrice || buyPrice <= 0) {
      setError("평단가와 주수를 입력하세요.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: query }),
      });

      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        throw new Error(body.error ?? "종목을 찾을 수 없습니다.");
      }

      const data = (await response.json()) as ResolvedStock;

      addPosition({
        symbol: data.symbol,
        name: data.name,
        market: data.market,
        currency: data.currency,
        yahooSymbol: data.yahooSymbol,
        shares: shareCount,
        purchasePrice: buyPrice,
      });

      setStockName("");
      setShares("");
      setPurchasePrice("");
      setResolved(null);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "종목 추가 실패",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>종목 추가</CardTitle>
        <CardDescription>
          종목명, 평단가, 주수만 입력하세요. 종목 정보는 자동으로 찾아 채웁니다.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2 sm:col-span-1">
              <Label htmlFor="stockName">종목명</Label>
              <Input
                id="stockName"
                value={stockName}
                onChange={(event) => setStockName(event.target.value)}
                placeholder="한화엔진, 씨어스, 삼성전자..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="purchasePrice">평단가</Label>
              <Input
                id="purchasePrice"
                type="number"
                min="0"
                step="any"
                value={purchasePrice}
                onChange={(event) => setPurchasePrice(event.target.value)}
                placeholder="50000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="shares">주수</Label>
              <Input
                id="shares"
                type="number"
                min="0"
                step="1"
                value={shares}
                onChange={(event) => setShares(event.target.value)}
                placeholder="10"
              />
            </div>
          </div>

          {resolving && (
            <p className="text-sm text-muted-foreground">종목 검색 중...</p>
          )}

          {resolved && !resolving && (
            <div className="rounded-lg border bg-muted/40 px-4 py-3 text-sm">
              <p className="font-medium">
                {resolved.name}{" "}
                <span className="text-muted-foreground">
                  ({resolved.symbol} · {resolved.market})
                </span>
              </p>
              <p className="mt-1 text-muted-foreground">
                현재가{" "}
                <span
                  className={getChangeTextClass(
                    resolved.market,
                    resolved.changePercent,
                  )}
                >
                  {formatPrice(resolved.currentPrice, resolved.currency)}{" "}
                  {formatChangePercent(resolved.changePercent)}
                </span>
              </p>
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" disabled={loading || resolving}>
            {loading ? "추가 중..." : "포트폴리오에 추가"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
