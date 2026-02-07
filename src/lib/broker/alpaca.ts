import type { BrokerAccount, BrokerOrder, MarketData } from "@/types";

interface AlpacaConfig {
  apiKey: string;
  apiSecret: string;
  baseUrl: string;
}

function getConfig(): AlpacaConfig {
  return {
    apiKey: process.env.ALPACA_API_KEY || "",
    apiSecret: process.env.ALPACA_API_SECRET || "",
    baseUrl:
      process.env.ALPACA_BASE_URL || "https://paper-api.alpaca.markets",
  };
}

async function alpacaFetch(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const config = getConfig();
  const url = `${config.baseUrl}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      "APCA-API-KEY-ID": config.apiKey,
      "APCA-API-SECRET-KEY": config.apiSecret,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Alpaca API error ${response.status}: ${body}`);
  }

  return response;
}

async function alpacaDataFetch(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const config = getConfig();
  const url = `https://data.alpaca.markets${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      "APCA-API-KEY-ID": config.apiKey,
      "APCA-API-SECRET-KEY": config.apiSecret,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Alpaca Data API error ${response.status}: ${body}`);
  }

  return response;
}

export async function getAccount(): Promise<BrokerAccount> {
  const response = await alpacaFetch("/v2/account");
  const data = await response.json();

  return {
    id: data.id,
    cash: parseFloat(data.cash),
    portfolioValue: parseFloat(data.portfolio_value),
    buyingPower: parseFloat(data.buying_power),
    equity: parseFloat(data.equity),
    lastEquity: parseFloat(data.last_equity),
    longMarketValue: parseFloat(data.long_market_value),
    shortMarketValue: parseFloat(data.short_market_value),
    status: data.status,
  };
}

export async function submitOrder(params: {
  symbol: string;
  qty: number;
  side: "buy" | "sell";
  type?: "market" | "limit";
  timeInForce?: "day" | "gtc";
  limitPrice?: number;
}): Promise<BrokerOrder> {
  const response = await alpacaFetch("/v2/orders", {
    method: "POST",
    body: JSON.stringify({
      symbol: params.symbol,
      qty: params.qty.toString(),
      side: params.side,
      type: params.type || "market",
      time_in_force: params.timeInForce || "day",
      ...(params.limitPrice ? { limit_price: params.limitPrice.toString() } : {}),
    }),
  });

  const data = await response.json();

  return {
    id: data.id,
    symbol: data.symbol,
    side: data.side,
    qty: parseFloat(data.qty),
    type: data.type,
    timeInForce: data.time_in_force,
    limitPrice: data.limit_price ? parseFloat(data.limit_price) : undefined,
    status: data.status,
    filledAvgPrice: data.filled_avg_price
      ? parseFloat(data.filled_avg_price)
      : undefined,
    filledQty: data.filled_qty ? parseFloat(data.filled_qty) : undefined,
    createdAt: data.created_at,
  };
}

export async function cancelOrder(orderId: string): Promise<void> {
  await alpacaFetch(`/v2/orders/${orderId}`, { method: "DELETE" });
}

export async function cancelAllOrders(): Promise<void> {
  await alpacaFetch("/v2/orders", { method: "DELETE" });
}

export async function getPositions(): Promise<
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
  const response = await alpacaFetch("/v2/positions");
  const data = await response.json();

  return data.map(
    (p: Record<string, string>) => ({
      symbol: p.symbol,
      qty: parseFloat(p.qty),
      avgEntryPrice: parseFloat(p.avg_entry_price),
      currentPrice: parseFloat(p.current_price),
      marketValue: parseFloat(p.market_value),
      unrealizedPl: parseFloat(p.unrealized_pl),
      unrealizedPlpc: parseFloat(p.unrealized_plpc),
    })
  );
}

export async function getQuote(
  symbol: string
): Promise<MarketData> {
  const response = await alpacaDataFetch(
    `/v2/stocks/${symbol}/snapshot`
  );
  const data = await response.json();

  const latestTrade = data.latestTrade;
  const dailyBar = data.dailyBar;
  const prevDailyBar = data.prevDailyBar;

  const price = latestTrade?.p || 0;
  const previousClose = prevDailyBar?.c || 0;
  const change = price - previousClose;
  const changePercent = previousClose ? (change / previousClose) * 100 : 0;

  return {
    symbol,
    price,
    change,
    changePercent,
    volume: dailyBar?.v || 0,
    high: dailyBar?.h || 0,
    low: dailyBar?.l || 0,
    open: dailyBar?.o || 0,
    previousClose,
    timestamp: latestTrade?.t || new Date().toISOString(),
  };
}

export async function getMultipleQuotes(
  symbols: string[]
): Promise<Map<string, MarketData>> {
  const results = new Map<string, MarketData>();

  // Fetch in parallel, max 5 at a time
  const batchSize = 5;
  for (let i = 0; i < symbols.length; i += batchSize) {
    const batch = symbols.slice(i, i + batchSize);
    const quotes = await Promise.allSettled(batch.map(getQuote));

    quotes.forEach((result, idx) => {
      if (result.status === "fulfilled") {
        results.set(batch[idx], result.value);
      }
    });
  }

  return results;
}
