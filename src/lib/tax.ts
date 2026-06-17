import { calculateTossKrCommission } from "@/lib/commission";
import type { Market } from "@/types/market";

/** 코스피·코스닥 증권거래세 (농특세 포함) — 매도 시 항상 부과 */
export const KR_SECURITIES_TRANSACTION_TAX_RATE = 0.0015;

/** 해외주식 양도소득세: 20% + 지방 2% */
export const US_CAPITAL_GAINS_TAX_RATE = 0.22;

/** 국내 대주주 양도소득세 (지방세 포함) */
export const KR_CAPITAL_GAINS_TAX_RATE = 0.22;

/** 종목당 10억원 이상 시 대주주 양도세 검토 대상 (2025 기준) */
export const KR_MAJOR_SHAREHOLDER_THRESHOLD_KRW = 1_000_000_000;

export interface TaxBreakdown {
  transactionTax: number;
  capitalGainsTax: number;
  estimatedTax: number;
  buyCommission: number;
  sellCommission: number;
  totalCommission: number;
  gainAfterTax: number;
  gainPercentAfterTax: number;
  taxLabel: string;
  taxDetails: string[];
  commissionLabel: string;
  commissionDetails: string[];
}

export interface TaxCalculationInput {
  market: Market;
  gainAmount: number;
  totalCost: number;
  totalValue: number;
  /** 대주주 양도소득세 강제 적용 (설정) */
  forceKrCapitalGainsTax?: boolean;
}

function isKrMajorShareholderByValue(totalValueKrw: number): boolean {
  return totalValueKrw >= KR_MAJOR_SHAREHOLDER_THRESHOLD_KRW;
}

export function calculateTaxBreakdown(input: TaxCalculationInput): TaxBreakdown {
  const { market, gainAmount, totalCost, totalValue, forceKrCapitalGainsTax } =
    input;

  if (market === "KR") {
    const transactionTax = totalValue * KR_SECURITIES_TRANSACTION_TAX_RATE;

    const applyCapitalGainsTax =
      forceKrCapitalGainsTax || isKrMajorShareholderByValue(totalValue);

    const capitalGainsTax =
      applyCapitalGainsTax && gainAmount > 0
        ? gainAmount * KR_CAPITAL_GAINS_TAX_RATE
        : 0;

    const commission = calculateTossKrCommission(totalCost, totalValue);
    const estimatedTax = transactionTax + capitalGainsTax;
    const gainAfterTax =
      gainAmount - estimatedTax - commission.totalCommission;

    const taxDetails = [
      `증권거래세 ${(KR_SECURITIES_TRANSACTION_TAX_RATE * 100).toFixed(2)}% (${Math.round(transactionTax).toLocaleString()}원)`,
    ];

    if (capitalGainsTax > 0) {
      taxDetails.push(
        `양도소득세 22% (${Math.round(capitalGainsTax).toLocaleString()}원)`,
      );
    } else if (!applyCapitalGainsTax) {
      taxDetails.push("양도소득세: 일반투자자 비과세 (대주주 아님)");
    }

    return {
      transactionTax,
      capitalGainsTax,
      estimatedTax,
      buyCommission: commission.buyCommission,
      sellCommission: commission.sellCommission,
      totalCommission: commission.totalCommission,
      gainAfterTax,
      gainPercentAfterTax:
        totalCost > 0 ? (gainAfterTax / totalCost) * 100 : 0,
      taxLabel:
        capitalGainsTax > 0
          ? "거래세 + 양도소득세"
          : "증권거래세 (매도 시)",
      taxDetails,
      commissionLabel: commission.commissionLabel,
      commissionDetails: commission.commissionDetails,
    };
  }

  const transactionTax = 0;
  const capitalGainsTax =
    gainAmount > 0 ? gainAmount * US_CAPITAL_GAINS_TAX_RATE : 0;
  const estimatedTax = capitalGainsTax;
  const gainAfterTax = gainAmount - estimatedTax;

  return {
    transactionTax,
    capitalGainsTax,
    estimatedTax,
    buyCommission: 0,
    sellCommission: 0,
    totalCommission: 0,
    gainAfterTax,
    gainPercentAfterTax: totalCost > 0 ? (gainAfterTax / totalCost) * 100 : 0,
    taxLabel: "해외주식 양도소득세 22%",
    taxDetails: [
      capitalGainsTax > 0
        ? `양도소득세 22% ($${capitalGainsTax.toFixed(2)})`
        : "손실 구간 — 양도소득세 없음",
    ],
    commissionLabel: "",
    commissionDetails: [],
  };
}
