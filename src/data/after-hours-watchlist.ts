/** 시간외 스캔 대상 — 유동성 높은 국내 종목 + 사용자 포트폴리오 병합 */
export const AFTER_HOURS_SCAN_SYMBOLS: string[] = [
  "005930",
  "000660",
  "373220",
  "207940",
  "005380",
  "000270",
  "068270",
  "035420",
  "035720",
  "051910",
  "006400",
  "105560",
  "055550",
  "012330",
  "028260",
  "003550",
  "086520",
  "247540",
  "082740",
  "042660",
  "010140",
  "329180",
  "458870",
  "041510",
  "122870",
  "037270",
  "003670",
  "196170",
  "403870",
];

export function mergeScanSymbols(portfolioSymbols: string[]): string[] {
  const merged = new Set([...AFTER_HOURS_SCAN_SYMBOLS, ...portfolioSymbols]);
  return Array.from(merged);
}
