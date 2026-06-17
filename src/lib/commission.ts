/** 토스증권 KRX(코스피·코스닥) 매매수수료 — 매수·매도 각각 0.015% */
export const TOSS_KR_KRX_COMMISSION_RATE = 0.00015;

export interface CommissionBreakdown {
  buyCommission: number;
  sellCommission: number;
  totalCommission: number;
  commissionLabel: string;
  commissionDetails: string[];
}

export function calculateTossKrCommission(
  totalCost: number,
  totalValue: number,
): CommissionBreakdown {
  const buyCommission = totalCost * TOSS_KR_KRX_COMMISSION_RATE;
  const sellCommission = totalValue * TOSS_KR_KRX_COMMISSION_RATE;
  const totalCommission = buyCommission + sellCommission;

  return {
    buyCommission,
    sellCommission,
    totalCommission,
    commissionLabel: "토스증권 수수료",
    commissionDetails: [
      `매수 ${(TOSS_KR_KRX_COMMISSION_RATE * 100).toFixed(3)}% (${Math.round(buyCommission).toLocaleString()}원)`,
      `매도 ${(TOSS_KR_KRX_COMMISSION_RATE * 100).toFixed(3)}% (${Math.round(sellCommission).toLocaleString()}원)`,
    ],
  };
}
