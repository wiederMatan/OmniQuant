import type { BrokerAccount, BrokerOrder, MarketData } from "@/types";
import * as alpaca from "./alpaca";
import * as paper from "./paper";

/**
 * Broker Bridge - Routes all trading operations through either
 * the paper trading simulator or the real Alpaca API.
 *
 * IMPORTANT: Defaults to paper trading. Real trading requires
 * explicit configuration and is gated behind environment variables.
 */

function isPaperMode(): boolean {
  return process.env.TRADING_MODE !== "live";
}

export async function getAccount(): Promise<BrokerAccount> {
  if (isPaperMode()) {
    return paper.getPaperAccount();
  }
  return alpaca.getAccount();
}

export async function submitOrder(params: {
  symbol: string;
  qty: number;
  side: "buy" | "sell";
  type?: "market" | "limit";
  timeInForce?: "day" | "gtc";
  limitPrice?: number;
  currentPrice?: number;
}): Promise<BrokerOrder> {
  if (isPaperMode()) {
    if (!params.currentPrice) {
      throw new Error("currentPrice is required for paper trading");
    }
    return paper.submitPaperOrder({
      ...params,
      currentPrice: params.currentPrice,
    });
  }
  return alpaca.submitOrder(params);
}

export async function cancelOrder(orderId: string): Promise<void> {
  if (isPaperMode()) {
    return paper.cancelPaperOrder(orderId);
  }
  return alpaca.cancelOrder(orderId);
}

export async function cancelAllOrders(): Promise<void> {
  if (isPaperMode()) {
    return paper.cancelAllPaperOrders();
  }
  return alpaca.cancelAllOrders();
}

export async function getPositions() {
  if (isPaperMode()) {
    return paper.getPaperPositions();
  }
  return alpaca.getPositions();
}

export async function getQuote(symbol: string): Promise<MarketData> {
  if (isPaperMode()) {
    return paper.getPaperQuote(symbol);
  }
  return alpaca.getQuote(symbol);
}

export async function getMultipleQuotes(
  symbols: string[]
): Promise<Map<string, MarketData>> {
  if (isPaperMode()) {
    const map = new Map<string, MarketData>();
    symbols.forEach((s) => map.set(s, paper.getPaperQuote(s)));
    return map;
  }
  return alpaca.getMultipleQuotes(symbols);
}

export function getTradingMode(): "paper" | "live" {
  return isPaperMode() ? "paper" : "live";
}
