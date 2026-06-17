import type { Currency, Market } from "@/types/market";

export interface UserPosition {
  id: string;
  symbol: string;
  name: string;
  market: Market;
  currency: Currency;
  yahooSymbol: string;
  shares: number;
  purchasePrice: number;
  createdAt: string;
}

export interface LiveHolding {
  id: string;
  symbol: string;
  name: string;
  market: Market;
  shares: number;
  purchasePrice: number;
  currentPrice: number;
  currency: Currency;
  changePercent: number;
  gainAmount: number;
  gainPercent: number;
  totalValue: number;
  totalCost: number;
  sparkline: number[];
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
  valueKrw: number;
  gainAmountKrw: number;
  estimatedTaxKrw: number;
  totalCommissionKrw: number;
  gainAfterTaxKrw: number;
}

export type SellUrgency = "high" | "medium" | "low";
export type SellActionType = "take_profit" | "stop_loss" | "decline_review";

export interface SellRecommendation {
  holdingId: string;
  symbol: string;
  name: string;
  market: Market;
  urgency: SellUrgency;
  action: SellActionType;
  headline: string;
  reason: string;
  llmReason?: string;
  upsideNote?: string;
  adviceSource: "rule" | "llm";
  gainPercent: number;
  changePercent: number;
  currentPrice: number;
  purchasePrice: number;
}

export interface PortfolioInput {
  symbol: string;
  name: string;
  market: Market;
  currency: Currency;
  yahooSymbol: string;
  shares: number;
  purchasePrice: number;
}
