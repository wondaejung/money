"use client";

import { useRef, useState } from "react";
import { Download, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  downloadPortfolioBackup,
  parsePortfolioBackup,
} from "@/lib/portfolio-backup";
import { usePortfolioStore } from "@/store/portfolio-store";

export function PortfolioBackupTools() {
  const positions = usePortfolioStore((state) => state.positions);
  const replacePositions = usePortfolioStore((state) => state.replacePositions);
  const mergePositions = usePortfolioStore((state) => state.mergePositions);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleExport() {
    setError(null);
    if (positions.length === 0) {
      setError("보낼 종목이 없습니다.");
      return;
    }
    downloadPortfolioBackup(positions);
    setMessage(`${positions.length}개 종목을 JSON 파일로 저장했습니다.`);
  }

  async function handleImportFile(file: File, mode: "replace" | "merge") {
    setError(null);
    setMessage(null);

    try {
      const text = await file.text();
      const imported = parsePortfolioBackup(text);

      if (imported.length === 0) {
        throw new Error("백업 파일에 종목이 없습니다.");
      }

      if (mode === "replace") {
        replacePositions(imported);
        setMessage(`${imported.length}개 종목으로 교체했습니다.`);
      } else {
        mergePositions(imported);
        setMessage(`${imported.length}개 종목을 병합했습니다.`);
      }
    } catch (importError) {
      setError(
        importError instanceof Error
          ? importError.message
          : "가져오기에 실패했습니다.",
      );
    }
  }

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">브라우저 간 포트폴리오 옮기기</CardTitle>
        <CardDescription>
          Cursor와 Chrome은 저장소가 분리됩니다. JSON으로 보낸 뒤 다른
          브라우저에서 가져오세요.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={handleExport}
            disabled={positions.length === 0}
          >
            <Download className="size-4" />
            JSON 보내기 ({positions.length})
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="size-4" />
            JSON 가져오기
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              const replace = window.confirm(
                "기존 종목을 모두 교체할까요?\n\n확인 = 전체 교체\n취소 = 없는 종목만 추가",
              );
              void handleImportFile(file, replace ? "replace" : "merge");
              event.target.value = "";
            }}
          />
        </div>

        <ol className="list-decimal space-y-1 pl-4 text-xs text-muted-foreground">
          <li>Cursor에서 <strong>JSON 보내기</strong> 클릭 → 파일 저장</li>
          <li>Chrome에서 <code className="text-foreground">localhost:3000/portfolio</code> 접속</li>
          <li><strong>JSON 가져오기</strong>로 방금 저장한 파일 선택</li>
        </ol>

        {message && <p className="text-sm text-emerald-600">{message}</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}
