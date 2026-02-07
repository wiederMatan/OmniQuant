import { NextResponse } from "next/server";
import * as broker from "@/lib/broker";

export async function GET() {
  try {
    const [account, positions] = await Promise.all([
      broker.getAccount(),
      broker.getPositions(),
    ]);

    const investedValue = positions.reduce((sum, p) => sum + p.marketValue, 0);
    const totalPnL = positions.reduce((sum, p) => sum + p.unrealizedPl, 0);
    const dailyPnL = account.equity - account.lastEquity;

    return NextResponse.json({
      totalValue: account.equity,
      cashBalance: account.cash,
      investedValue,
      dailyPnL,
      dailyPnLPercent: account.lastEquity
        ? (dailyPnL / account.lastEquity) * 100
        : 0,
      totalPnL,
      totalPnLPercent: investedValue > 0 ? (totalPnL / investedValue) * 100 : 0,
      positions: positions.map((p) => ({
        symbol: p.symbol,
        name: p.symbol,
        quantity: p.qty,
        avgCost: p.avgEntryPrice,
        currentPrice: p.currentPrice,
        marketValue: p.marketValue,
        unrealizedPnL: p.unrealizedPl,
        unrealizedPnLPercent: p.unrealizedPlpc * 100,
      })),
      tradingMode: broker.getTradingMode(),
    });
  } catch (error) {
    console.error("Portfolio fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch portfolio" },
      { status: 500 }
    );
  }
}
