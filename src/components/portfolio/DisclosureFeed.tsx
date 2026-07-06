"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { ExternalLink, RefreshCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Disclosure, DisclosureApiResponse } from "@/types/disclosure";
import type { UserPosition } from "@/types/portfolio";

interface DisclosureFeedProps {
  positions: UserPosition[];
}

function formatReceiptDate(value: string): string {
  if (!/^\d{8}$/.test(value)) return value;
  return `${value.slice(4, 6)}.${value.slice(6, 8)}`;
}

function dartViewerUrl(rceptNo: string): string {
  return `https://dart.fss.or.kr/dsaf001/main.do?rcpNo=${rceptNo}`;
}

export function DisclosureFeed({ positions }: DisclosureFeedProps) {
  const krSymbols = useMemo(
    () =>
      [
        ...new Set(
          positions
            .filter((position) => position.market === "KR")
            .map((position) => position.symbol),
        ),
      ].join(","),
    [positions],
  );

  const [disclosures, setDisclosures] = useState<Disclosure[]>([]);
  const [configured, setConfigured] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importantOnly, setImportantOnly] = useState(false);

  const load = useCallback(async () => {
    if (!krSymbols) {
      setDisclosures([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/disclosures?symbols=${encodeURIComponent(krSymbols)}`,
        { cache: "no-store" },
      );
      const data = (await response.json()) as DisclosureApiResponse;

      setConfigured(data.configured);
      setDisclosures(data.disclosures ?? []);
      if (data.error) setError(data.error);
    } catch {
      setError("공시 데이터를 가져오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [krSymbols]);

  useEffect(() => {
    void load();
  }, [load]);

  if (positions.length === 0) return null;

  const visible = importantOnly
    ? disclosures.filter((d) => d.important)
    : disclosures;
  const importantCount = disclosures.filter((d) => d.important).length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>보유 종목 공시</CardTitle>
            <CardDescription>
              최근 30일 DART 전자공시 · 수주·계약·증자 등 주요 공시는 배지로
              표시됩니다.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {importantCount > 0 && (
              <button
                type="button"
                onClick={() => setImportantOnly((prev) => !prev)}
                className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                  importantOnly
                    ? "border-foreground bg-foreground text-background"
                    : "border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                주요만 {importantCount}
              </button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => void load()}
              disabled={loading}
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
                aria-hidden
              />
              새로고침
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!configured ? (
          <div className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">
              DART API 키가 설정되지 않았습니다.
            </p>
            <ol className="mt-1.5 list-decimal space-y-0.5 pl-4 text-xs">
              <li>
                <a
                  href="https://opendart.fss.or.kr"
                  target="_blank"
                  rel="noreferrer"
                  className="underline underline-offset-2"
                >
                  opendart.fss.or.kr
                </a>
                에서 무료 인증키 발급 (즉시 발급)
              </li>
              <li>
                <code className="rounded bg-muted px-1">.env</code>와 Vercel
                환경변수에 <code className="rounded bg-muted px-1">DART_API_KEY</code>{" "}
                추가
              </li>
            </ol>
          </div>
        ) : loading && disclosures.length === 0 ? (
          <div className="h-32 animate-pulse rounded-lg bg-muted" />
        ) : error && disclosures.length === 0 ? (
          <p className="text-sm text-amber-600">{error}</p>
        ) : visible.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {importantOnly
              ? "최근 30일 내 주요 공시가 없습니다."
              : "최근 30일 내 공시가 없습니다."}
          </p>
        ) : (
          <ul className="divide-y">
            {visible.map((disclosure) => (
              <li
                key={disclosure.rceptNo}
                className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0"
              >
                <span className="w-11 shrink-0 pt-0.5 font-mono text-xs text-muted-foreground">
                  {formatReceiptDate(disclosure.receiptDate)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs font-medium text-muted-foreground">
                      {disclosure.corpName}
                    </span>
                    {disclosure.important && (
                      <Badge
                        variant="destructive"
                        className="px-1.5 py-0 text-[10px]"
                      >
                        주요
                      </Badge>
                    )}
                  </div>
                  <a
                    href={dartViewerUrl(disclosure.rceptNo)}
                    target="_blank"
                    rel="noreferrer"
                    className="group mt-0.5 flex items-start gap-1 text-sm hover:underline"
                  >
                    <span className="min-w-0 break-keep">
                      {disclosure.reportName}
                    </span>
                    <ExternalLink
                      className="mt-1 h-3 w-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                      aria-hidden
                    />
                  </a>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
