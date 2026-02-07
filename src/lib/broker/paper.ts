import type { BrokerAccount, BrokerOrder, MarketData } from "@/types";
import prisma from "@/lib/db";

/**
 * Paper Trading Broker - Simulates trades without real money.
 * This is the default broker and must be used for all development/testing.
 */

const INITIAL_CASH = 100_000;

interface PaperState {
  cash: number;
  positions: Map<string, { qty: number; avgPrice: number }>;
  orders: BrokerOrder[];
}

// In-memory paper trading state (resets on restart)
let paperState: PaperState | null = null;

async function getState(): Promise<PaperState> {
  if (paperState) return paperState;

  // Initialize from DB if available
  const settings = await prisma.settings.findFirst();
  const assets = await prisma.asset.findMany({
    where: settings ? { userId: settings.userId } : undefined,
  });

  const positions = new Map<string, { qty: number; avgPrice: number }>();
  assets.forEach((a) => {
    if (a.quantity > 0) {
      positions.set(a.symbol, { qty: a.quantity, avgPrice: a.avgCost });
    }
  });

  paperState = {
    cash: INITIAL_CASH,
    positions,
    orders: [],
  };

  return paperState;
}

export async function getPaperAccount(): Promise<BrokerAccount> {
  const state = await getState();

  let longMarketValue = 0;
  for (const [, pos] of state.positions) {
    longMarketValue += pos.qty * pos.avgPrice;
  }

  const equity = state.cash + longMarketValue;

  return {
    id: "paper-account",
    cash: state.cash,
    portfolioValue: equity,
    buyingPower: state.cash,
    equity,
    lastEquity: equity,
    longMarketValue,
    shortMarketValue: 0,
    status: "ACTIVE",
  };
}

export async function submitPaperOrder(params: {
  symbol: string;
  qty: number;
  side: "buy" | "sell";
  type?: "market" | "limit";
  timeInForce?: "day" | "gtc";
  limitPrice?: number;
  currentPrice: number;
}): Promise<BrokerOrder> {
  const state = await getState();
  const price = params.limitPrice || params.currentPrice;
  const totalCost = price * params.qty;

  if (params.side === "buy") {
    if (totalCost > state.cash) {
      throw new Error(
        `Insufficient buying power. Need $${totalCost.toFixed(2)}, have $${state.cash.toFixed(2)}`
      );
    }

    state.cash -= totalCost;
    const existing = state.positions.get(params.symbol);

    if (existing) {
      const newTotalCost =
        existing.avgPrice * existing.qty + price * params.qty;
      const newQty = existing.qty + params.qty;
      existing.avgPrice = newTotalCost / newQty;
      existing.qty = newQty;
    } else {
      state.positions.set(params.symbol, {
        qty: params.qty,
        avgPrice: price,
      });
    }
  } else {
    // sell
    const existing = state.positions.get(params.symbol);
    if (!existing || existing.qty < params.qty) {
      throw new Error(
        `Insufficient shares. Have ${existing?.qty || 0}, trying to sell ${params.qty}`
      );
    }

    state.cash += totalCost;
    existing.qty -= params.qty;

    if (existing.qty === 0) {
      state.positions.delete(params.symbol);
    }
  }

  const order: BrokerOrder = {
    id: `paper-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    symbol: params.symbol,
    side: params.side,
    qty: params.qty,
    type: params.type || "market",
    timeInForce: params.timeInForce || "day",
    limitPrice: params.limitPrice,
    status: "filled",
    filledAvgPrice: price,
    filledQty: params.qty,
    createdAt: new Date().toISOString(),
  };

  state.orders.push(order);
  return order;
}

export async function getPaperPositions(): Promise<
  Array<{
    symbol: string;
    qty: number;
    avgEntryPrice: number;
    currentPrice: number;
    marketValue: number;
    unrealizedPl: number;
    unrealizedPlpc: number;
  }>
> {
  const state = await getState();
  const result = [];

  for (const [symbol, pos] of state.positions) {
    // In a real scenario we'd fetch current prices; here we use avgPrice as placeholder
    result.push({
      symbol,
      qty: pos.qty,
      avgEntryPrice: pos.avgPrice,
      currentPrice: pos.avgPrice,
      marketValue: pos.qty * pos.avgPrice,
      unrealizedPl: 0,
      unrealizedPlpc: 0,
    });
  }

  return result;
}

export async function cancelPaperOrder(orderId: string): Promise<void> {
  const state = await getState();
  const idx = state.orders.findIndex((o) => o.id === orderId);
  if (idx !== -1) {
    state.orders[idx].status = "cancelled";
  }
}

export async function cancelAllPaperOrders(): Promise<void> {
  const state = await getState();
  state.orders.forEach((o) => {
    if (o.status === "new" || o.status === "accepted") {
      o.status = "cancelled";
    }
  });
}

export function getPaperQuote(symbol: string): MarketData {
  // Simulated quote with slight randomness for paper trading
  const basePrice = 150 + Math.random() * 50;
  const change = (Math.random() - 0.5) * 5;

  return {
    symbol,
    price: basePrice,
    change,
    changePercent: (change / basePrice) * 100,
    volume: Math.floor(Math.random() * 10_000_000),
    high: basePrice + Math.abs(change) + 2,
    low: basePrice - Math.abs(change) - 2,
    open: basePrice - change / 2,
    previousClose: basePrice - change,
    timestamp: new Date().toISOString(),
  };
}
