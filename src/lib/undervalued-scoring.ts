export function recalculateDiscount(per: number, sectorAvgPer: number): number {
  if (sectorAvgPer <= 0 || per <= 0) return 0;
  return Math.round((1 - per / sectorAvgPer) * 100);
}

export function computeUndervaluedScore(
  discountPercent: number,
  roe: number,
  pbr: number,
): number {
  if (discountPercent <= 0) {
    return Math.max(0, Math.round(20 + discountPercent * 0.5));
  }

  const discountScore = Math.min(70, discountPercent * 1.4);
  const roeScore = Math.min(15, roe * 0.8);
  const pbrScore = pbr < 1 ? 15 : pbr < 1.5 ? 8 : 0;

  return Math.round(Math.min(100, discountScore + roeScore + pbrScore));
}

export function scaleFundamentalsByPrice(
  baselinePrice: number,
  livePrice: number,
  baseline: { per: number; pbr: number; roe: number },
): { per: number; pbr: number; roe: number } {
  if (baselinePrice <= 0 || livePrice <= 0) {
    return baseline;
  }

  const ratio = livePrice / baselinePrice;
  return {
    per: baseline.per * ratio,
    pbr: baseline.pbr * ratio,
    roe: baseline.roe,
  };
}
