export function formatKrw(value: number): string {
  if (Math.abs(value) >= 100_000_000) {
    return `${(value / 100_000_000).toFixed(2)}억원`;
  }
  if (Math.abs(value) >= 10_000) {
    return `${Math.round(value / 10_000).toLocaleString()}만원`;
  }
  return `${Math.round(value).toLocaleString()}원`;
}

export function formatPrice(value: number, currency: string): string {
  if (currency === "KRW") {
    return `${Math.round(value).toLocaleString()}원`;
  }
  return `$${value.toFixed(2)}`;
}
