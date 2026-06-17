import type { Currency, Market } from "@/types/market";

export interface PortfolioPosition {
  id: string;
  symbol: string;
  name: string;
  market: Market;
  shares: number;
  currency: Currency;
  yahooSymbol: string;
}

export const portfolioPositions: PortfolioPosition[] = [
  {
    id: "kr-1",
    symbol: "005930",
    name: "삼성전자",
    market: "KR",
    shares: 120,
    currency: "KRW",
    yahooSymbol: "005930.KS",
  },
  {
    id: "kr-2",
    symbol: "000660",
    name: "SK하이닉스",
    market: "KR",
    shares: 45,
    currency: "KRW",
    yahooSymbol: "000660.KS",
  },
  {
    id: "kr-3",
    symbol: "035420",
    name: "NAVER",
    market: "KR",
    shares: 30,
    currency: "KRW",
    yahooSymbol: "035420.KS",
  },
  {
    id: "kr-4",
    symbol: "207940",
    name: "삼성바이오로직스",
    market: "KR",
    shares: 8,
    currency: "KRW",
    yahooSymbol: "207940.KS",
  },
  {
    id: "kr-5",
    symbol: "068270",
    name: "셀트리온",
    market: "KR",
    shares: 25,
    currency: "KRW",
    yahooSymbol: "068270.KS",
  },
  {
    id: "us-1",
    symbol: "NVDA",
    name: "NVIDIA",
    market: "US",
    shares: 15,
    currency: "USD",
    yahooSymbol: "NVDA",
  },
  {
    id: "us-2",
    symbol: "AAPL",
    name: "Apple",
    market: "US",
    shares: 40,
    currency: "USD",
    yahooSymbol: "AAPL",
  },
  {
    id: "us-3",
    symbol: "MSFT",
    name: "Microsoft",
    market: "US",
    shares: 20,
    currency: "USD",
    yahooSymbol: "MSFT",
  },
  {
    id: "us-4",
    symbol: "LLY",
    name: "Eli Lilly",
    market: "US",
    shares: 6,
    currency: "USD",
    yahooSymbol: "LLY",
  },
];
