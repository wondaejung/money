export function fmtPct(value: number, digits = 1): string {
  const sign = value > 0 ? "+" : value < 0 ? "" : "";
  return `${sign}${value.toFixed(digits)}%`;
}

export function fmtPriceKrw(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 10_000) return `${Math.round(value / 1000)}K`;
  return String(Math.round(value));
}

export function compressUsIndex(
  name: string,
  value: number,
  changePercent: number,
): string {
  return `${name}:${value.toFixed(0)}:${fmtPct(changePercent)}`;
}

export function compressUsStock(
  symbol: string,
  name: string,
  changePercent: number,
): string {
  return `${symbol}|${name}|${fmtPct(changePercent)}`;
}

export function compressSparkline(sparkline: number[]): string {
  if (sparkline.length < 2) return "m:na";

  const first = sparkline[0];
  const last = sparkline[sparkline.length - 1];
  const min = Math.min(...sparkline);
  const max = Math.max(...sparkline);
  const intraday =
    first > 0 ? ((last - first) / first) * 100 : 0;

  return `m:${fmtPct(intraday)} h:${fmtPriceKrw(max)} l:${fmtPriceKrw(min)}`;
}

export function compressAfterHoursCandidate(input: {
  symbol: string;
  name: string;
  regularClosePrice: number;
  afterHoursClosePrice: number;
  afterHoursChangePercent: number;
  regularChangePercent: number;
}): string {
  return [
    input.symbol,
    input.name,
    `R${fmtPriceKrw(input.regularClosePrice)}`,
    `A${fmtPriceKrw(input.afterHoursClosePrice)}`,
    `ah${fmtPct(input.afterHoursChangePercent)}`,
    `rg${fmtPct(input.regularChangePercent)}`,
  ].join("|");
}

export function compressSellCandidate(input: {
  holdingId: string;
  symbol: string;
  action: string;
  purchasePrice: number;
  currentPrice: number;
  gainPercent: number;
  changePercent: number;
  sparkline: number[];
}): string {
  return [
    `id=${input.holdingId}`,
    input.symbol,
    input.action,
    `buy${fmtPriceKrw(input.purchasePrice)}`,
    `px${fmtPriceKrw(input.currentPrice)}`,
    `g${fmtPct(input.gainPercent)}`,
    `d${fmtPct(input.changePercent)}`,
    compressSparkline(input.sparkline),
  ].join("|");
}
