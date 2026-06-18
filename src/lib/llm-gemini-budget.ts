import {
  getPortfolioFromStore,
  incrementPortfolioStoreCounter,
  isPortfolioStoreConfigured,
} from "@/lib/portfolio-kv";

const DEFAULT_MAX_RPD = 16;
const DEFAULT_MAX_RPM = 8;
const DEFAULT_MIN_INTERVAL_MS = 7_000;

let lastGeminiCallAt = 0;
let memoryRpdDate = "";
let memoryRpdCount = 0;
let memoryRpmBucket = "";
let memoryRpmCount = 0;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function kstDateKey(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
  }).format(new Date());
}

function kstMinuteBucket(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());

  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "00";

  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

export function getGeminiMaxRpd(): number {
  const value = Number(process.env.GEMINI_MAX_RPD ?? DEFAULT_MAX_RPD);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : DEFAULT_MAX_RPD;
}

export function getGeminiMaxRpm(): number {
  const value = Number(process.env.GEMINI_MAX_RPM ?? DEFAULT_MAX_RPM);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : DEFAULT_MAX_RPM;
}

export function getGeminiMinIntervalMs(): number {
  const value = Number(process.env.GEMINI_MIN_INTERVAL_MS ?? DEFAULT_MIN_INTERVAL_MS);
  return Number.isFinite(value) && value >= 0
    ? Math.floor(value)
    : DEFAULT_MIN_INTERVAL_MS;
}

async function readCounter(key: string): Promise<number> {
  if (!isPortfolioStoreConfigured()) return 0;
  const raw = await getPortfolioFromStore<string | number>(`llm:${key}`);
  const count = Number(raw ?? 0);
  return Number.isFinite(count) ? count : 0;
}

async function getRpdCount(dateKey: string): Promise<number> {
  if (isPortfolioStoreConfigured()) {
    return readCounter(`gemini:rpd:${dateKey}`);
  }

  if (memoryRpdDate !== dateKey) {
    memoryRpdDate = dateKey;
    memoryRpdCount = 0;
  }
  return memoryRpdCount;
}

async function getRpmCount(minuteBucket: string): Promise<number> {
  if (isPortfolioStoreConfigured()) {
    return readCounter(`gemini:rpm:${minuteBucket}`);
  }

  if (memoryRpmBucket !== minuteBucket) {
    memoryRpmBucket = minuteBucket;
    memoryRpmCount = 0;
  }
  return memoryRpmCount;
}

export async function getGeminiBudgetStatus(): Promise<{
  rpdUsed: number;
  rpdLimit: number;
  rpmUsed: number;
  rpmLimit: number;
}> {
  const dateKey = kstDateKey();
  const minuteBucket = kstMinuteBucket();

  return {
    rpdUsed: await getRpdCount(dateKey),
    rpdLimit: getGeminiMaxRpd(),
    rpmUsed: await getRpmCount(minuteBucket),
    rpmLimit: getGeminiMaxRpm(),
  };
}

export async function waitForGeminiBudgetSlot(): Promise<{
  allowed: boolean;
  error?: string;
}> {
  const maxRpd = getGeminiMaxRpd();
  const maxRpm = getGeminiMaxRpm();
  const minIntervalMs = getGeminiMinIntervalMs();

  for (let attempt = 0; attempt < 30; attempt += 1) {
    const dateKey = kstDateKey();
    const minuteBucket = kstMinuteBucket();
    const rpdUsed = await getRpdCount(dateKey);
    const rpmUsed = await getRpmCount(minuteBucket);

    if (rpdUsed >= maxRpd) {
      return {
        allowed: false,
        error: `Gemini 일일 요청 한도(${maxRpd} RPD)에 도달했습니다. 내일 다시 시도하거나 캐시된 결과를 사용합니다.`,
      };
    }

    const sinceLastCall = Date.now() - lastGeminiCallAt;
    const rpmOk = rpmUsed < maxRpm;
    const intervalOk = lastGeminiCallAt === 0 || sinceLastCall >= minIntervalMs;

    if (rpmOk && intervalOk) {
      return { allowed: true };
    }

    const waitMs = Math.max(
      intervalOk ? 0 : minIntervalMs - sinceLastCall,
      rpmOk ? 0 : 8_000,
      500,
    );
    await sleep(waitMs);
  }

  return {
    allowed: false,
    error: "Gemini 분당 요청 한도(RPM) 대기 시간이 초과되었습니다.",
  };
}

export async function recordGeminiApiCall(): Promise<void> {
  const dateKey = kstDateKey();
  const minuteBucket = kstMinuteBucket();
  lastGeminiCallAt = Date.now();

  if (isPortfolioStoreConfigured()) {
    const rpd = await incrementPortfolioStoreCounter(
      `llm:gemini:rpd:${dateKey}`,
      86_400,
    );
    const rpm = await incrementPortfolioStoreCounter(
      `llm:gemini:rpm:${minuteBucket}`,
      120,
    );
    memoryRpdDate = dateKey;
    memoryRpdCount = rpd;
    memoryRpmBucket = minuteBucket;
    memoryRpmCount = rpm;
    return;
  }

  if (memoryRpdDate !== dateKey) {
    memoryRpdDate = dateKey;
    memoryRpdCount = 0;
  }
  memoryRpdCount += 1;

  if (memoryRpmBucket !== minuteBucket) {
    memoryRpmBucket = minuteBucket;
    memoryRpmCount = 0;
  }
  memoryRpmCount += 1;
}
