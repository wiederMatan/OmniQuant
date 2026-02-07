export type TradeActionType = "BUY" | "SELL" | "HOLD";

export interface TradeDecision {
  action: TradeActionType;
  symbol: string;
  confidence: number; // 0-1
  reasoning: string;
  suggestedQuantity?: number;
  suggestedPrice?: number;
  sentiment?: number; // -1 to 1
  technicalScore?: number; // -1 to 1
}

export interface MarketData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  timestamp: string;
}

export interface NewsItem {
  title: string;
  description: string;
  source: string;
  url: string;
  publishedAt: string;
  sentiment?: number;
}

export interface PortfolioSummary {
  totalValue: number;
  cashBalance: number;
  investedValue: number;
  dailyPnL: number;
  dailyPnLPercent: number;
  totalPnL: number;
  totalPnLPercent: number;
  positions: PositionSummary[];
}

export interface PositionSummary {
  symbol: string;
  name: string;
  quantity: number;
  avgCost: number;
  currentPrice: number;
  marketValue: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
}

export interface RiskCheckResult {
  allowed: boolean;
  reason?: string;
  riskType?: string;
}

export interface BrokerOrder {
  id: string;
  symbol: string;
  side: "buy" | "sell";
  qty: number;
  type: "market" | "limit";
  timeInForce: "day" | "gtc";
  limitPrice?: number;
  status: string;
  filledAvgPrice?: number;
  filledQty?: number;
  createdAt: string;
}

export interface BrokerAccount {
  id: string;
  cash: number;
  portfolioValue: number;
  buyingPower: number;
  equity: number;
  lastEquity: number;
  longMarketValue: number;
  shortMarketValue: number;
  status: string;
}

export interface AnalysisContext {
  symbol: string;
  marketData: MarketData;
  news: NewsItem[];
  recentTrades: { action: string; price: number; date: string }[];
  currentPosition?: { quantity: number; avgCost: number };
  riskLimits: {
    maxTradeAmount: number;
    maxPositionSize: number;
    riskTolerancePct: number;
  };
}
