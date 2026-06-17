import type { StateStorage } from "zustand/middleware";

const STORAGE_KEY = "stock-portfolio-v1";

function readRaw(storage: Storage): string | null {
  return storage.getItem(STORAGE_KEY);
}

function writeRaw(storage: Storage, value: string): void {
  storage.setItem(STORAGE_KEY, value);
}

export const portfolioPersistStorage: StateStorage = {
  getItem: (name) => {
    if (typeof window === "undefined") return null;

    try {
      const fromLocal = localStorage.getItem(name);
      if (fromLocal) return fromLocal;

      const fromSession = sessionStorage.getItem(name);
      if (fromSession) {
        localStorage.setItem(name, fromSession);
        return fromSession;
      }
    } catch (error) {
      console.error("포트폴리오 저장소 읽기 실패:", error);
    }

    return null;
  },
  setItem: (name, value) => {
    if (typeof window === "undefined") return;

    try {
      localStorage.setItem(name, value);
      sessionStorage.setItem(name, value);
    } catch (error) {
      console.error("포트폴리오 저장소 쓰기 실패:", error);
    }
  },
  removeItem: (name) => {
    if (typeof window === "undefined") return;

    try {
      localStorage.removeItem(name);
      sessionStorage.removeItem(name);
    } catch (error) {
      console.error("포트폴리오 저장소 삭제 실패:", error);
    }
  },
};

export function getStoredPositionCount(): number {
  if (typeof window === "undefined") return 0;

  try {
    const raw = readRaw(localStorage) ?? readRaw(sessionStorage);
    if (!raw) return 0;

    const parsed = JSON.parse(raw) as {
      state?: { positions?: unknown[] };
      positions?: unknown[];
    };

    if (Array.isArray(parsed.state?.positions)) {
      return parsed.state.positions.length;
    }

    if (Array.isArray(parsed.positions)) {
      return parsed.positions.length;
    }
  } catch {
    return 0;
  }

  return 0;
}
