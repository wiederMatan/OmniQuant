import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import * as broker from "@/lib/broker";
import { fetchMarketNews } from "@/lib/ai/market-brain";
import { analyzeAndDecide } from "@/lib/ai/decision-engine";
import type { AnalysisContext } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { symbol, userId } = body;

    if (!symbol || !userId) {
      return NextResponse.json(
        { error: "Missing required fields: symbol, userId" },
        { status: 400 }
      );
    }

    const settings = await prisma.settings.findUnique({
      where: { userId },
    });

    if (!settings) {
      return NextResponse.json(
        { error: "User settings not found. Please configure settings first." },
        { status: 404 }
      );
    }

    // Gather market data and news in parallel
    const [marketData, news, recentTrades, currentAsset] = await Promise.all([
      broker.getQuote(symbol),
      fetchMarketNews([symbol]),
      prisma.trade.findMany({
        where: { userId, symbol, status: "EXECUTED" },
        orderBy: { executedAt: "desc" },
        take: 10,
      }),
      prisma.asset.findUnique({
        where: { symbol_userId: { symbol, userId } },
      }),
    ]);

    const context: AnalysisContext = {
      symbol,
      marketData,
      news,
      recentTrades: recentTrades.map((t) => ({
        action: t.action,
        price: t.price,
        date: t.executedAt?.toISOString() || t.createdAt.toISOString(),
      })),
      currentPosition: currentAsset
        ? { quantity: currentAsset.quantity, avgCost: currentAsset.avgCost }
        : undefined,
      riskLimits: {
        maxTradeAmount: settings.maxTradeAmount,
        maxPositionSize: settings.maxPositionSize,
        riskTolerancePct: settings.riskTolerancePct,
      },
    };

    const decision = await analyzeAndDecide(context, userId);

    return NextResponse.json({
      decision,
      marketData,
      newsCount: news.length,
      tradingMode: broker.getTradingMode(),
    });
  } catch (error) {
    console.error("Analysis error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Analysis failed" },
      { status: 500 }
    );
  }
}

// Get recent AI logs
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const limit = parseInt(searchParams.get("limit") || "20");

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  const logs = await prisma.aILog.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return NextResponse.json({ logs });
}
