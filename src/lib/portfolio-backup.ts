import type { UserPosition } from "@/types/portfolio";

export interface PortfolioBackupFile {
  version: 1;
  exportedAt: string;
  positions: UserPosition[];
}

export function createPortfolioBackup(
  positions: UserPosition[],
): PortfolioBackupFile {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    positions,
  };
}

function isUserPosition(value: unknown): value is UserPosition {
  if (!value || typeof value !== "object") return false;
  const position = value as UserPosition;
  return (
    typeof position.id === "string" &&
    typeof position.symbol === "string" &&
    typeof position.name === "string" &&
    (position.market === "KR" || position.market === "US") &&
    typeof position.yahooSymbol === "string" &&
    typeof position.shares === "number" &&
    typeof position.purchasePrice === "number"
  );
}

export function parsePortfolioBackup(raw: string): UserPosition[] {
  const parsed = JSON.parse(raw) as
    | PortfolioBackupFile
    | { state?: { positions?: unknown[] }; positions?: unknown[] }
    | unknown[];

  if (Array.isArray(parsed)) {
    if (!parsed.every(isUserPosition)) {
      throw new Error("백업 파일 형식이 올바르지 않습니다.");
    }
    return parsed;
  }

  const fromVersioned = (parsed as PortfolioBackupFile).positions;
  if (Array.isArray(fromVersioned)) {
    if (!fromVersioned.every(isUserPosition)) {
      throw new Error("백업 파일 형식이 올바르지 않습니다.");
    }
    return fromVersioned;
  }

  const fromZustand = (parsed as { state?: { positions?: unknown[] } }).state
    ?.positions;
  if (Array.isArray(fromZustand)) {
    if (!fromZustand.every(isUserPosition)) {
      throw new Error("localStorage 백업 형식이 올바르지 않습니다.");
    }
    return fromZustand;
  }

  const legacy = (parsed as { positions?: unknown[] }).positions;
  if (Array.isArray(legacy)) {
    if (!legacy.every(isUserPosition)) {
      throw new Error("백업 파일 형식이 올바르지 않습니다.");
    }
    return legacy;
  }

  throw new Error("인식할 수 없는 백업 형식입니다.");
}

export function downloadPortfolioBackup(positions: UserPosition[]): void {
  const backup = createPortfolioBackup(positions);
  const blob = new Blob([JSON.stringify(backup, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `portfolio-backup-${backup.exportedAt.slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}
