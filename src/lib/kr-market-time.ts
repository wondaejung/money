const KST_TIMEZONE = "Asia/Seoul";
const RESET_DAYS = 7;

/** 성공 판정 — baseline 대비 최소 상승률(%) */
export const PREDICTION_SUCCESS_THRESHOLD_PERCENT = 1.0;

export function getKstParts(date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: KST_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "0";

  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    hour: Number(get("hour")),
    minute: Number(get("minute")),
    second: Number(get("second")),
  };
}

export function formatKstDate(date = new Date()): string {
  const { year, month, day } = getKstParts(date);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function formatKstDateTime(date = new Date()): string {
  const { year, month, day, hour, minute } = getKstParts(date);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")} ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function toKstIso(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute = 0,
): string {
  const utc = Date.UTC(year, month - 1, day, hour - 9, minute);
  return new Date(utc).toISOString();
}

export function getAfterHoursCloseIso(tradingDate: string): string {
  const [year, month, day] = tradingDate.split("-").map(Number);
  return toKstIso(year, month, day, 18, 0);
}

export function getRegularMarketCloseIso(tradingDate: string): string {
  const [year, month, day] = tradingDate.split("-").map(Number);
  return toKstIso(year, month, day, 15, 30);
}

function dateFromYmd(ymd: string): Date {
  const [year, month, day] = ymd.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function ymdFromDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function getNextTradingDate(from = new Date()): string {
  const cursor = dateFromYmd(formatKstDate(from));
  cursor.setUTCDate(cursor.getUTCDate() + 1);

  while (cursor.getUTCDay() === 0 || cursor.getUTCDay() === 6) {
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return ymdFromDate(cursor);
}

export function getPreviousTradingDate(from = new Date()): string {
  const cursor = dateFromYmd(formatKstDate(from));
  cursor.setUTCDate(cursor.getUTCDate() - 1);

  while (cursor.getUTCDay() === 0 || cursor.getUTCDay() === 6) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  return ymdFromDate(cursor);
}

/** 해당 거래일 정규장이 마감되었는지 (15:30 KST 이후) */
export function isRegularSessionClosed(tradingDate: string, now = new Date()): boolean {
  const closeIso = getRegularMarketCloseIso(tradingDate);
  return now.getTime() >= new Date(closeIso).getTime();
}

/** 오늘 시간외 마감(18:00)이 지났는지 */
export function isAfterHoursSessionClosed(now = new Date()): boolean {
  const today = formatKstDate(now);
  const closeIso = getAfterHoursCloseIso(today);
  return now.getTime() >= new Date(closeIso).getTime();
}

export function getPredictionSessionDate(now = new Date()): string {
  const { hour } = getKstParts(now);
  if (hour < 18) {
    return getPreviousTradingDate(now);
  }
  return formatKstDate(now);
}

export function shouldResetPrediction(
  createdAt: string,
  isArchived: boolean,
  now = new Date(),
): boolean {
  if (isArchived) return false;
  const ageMs = now.getTime() - new Date(createdAt).getTime();
  return ageMs > RESET_DAYS * 24 * 60 * 60 * 1000;
}

export function evaluateVerification(
  baselinePrice: number,
  nextDayOpen: number | null,
  nextDayHigh: number | null,
): { outcome: "success" | "failure"; maxGainPercent: number } {
  const candidates = [nextDayOpen, nextDayHigh].filter(
    (price): price is number => typeof price === "number" && price > 0,
  );

  if (candidates.length === 0 || baselinePrice <= 0) {
    return { outcome: "failure", maxGainPercent: 0 };
  }

  const maxPrice = Math.max(...candidates);
  const maxGainPercent = ((maxPrice - baselinePrice) / baselinePrice) * 100;
  const outcome =
    maxGainPercent >= PREDICTION_SUCCESS_THRESHOLD_PERCENT ? "success" : "failure";

  return { outcome, maxGainPercent };
}
