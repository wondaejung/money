import type { Currency, Market } from "./market";

export interface StockHolding {
  id: string;
  symbol: string;
  name: string;
  market: Market;
  shares: number;
  currentPrice: number;
  currency: Currency;
  changePercent: number;
}

export interface TreemapNode {
  name: string;
  symbol: string;
  market: Market;
  size: number;
  changePercent: number;
  valueKrw: number;
  [key: string]: string | number;
}
