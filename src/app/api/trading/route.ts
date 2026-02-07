import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import * as broker from "@/lib/broker";
import { checkRiskLimits } from "@/lib/risk";
import { sendTradeAlert, sendRiskAlert } from "@/lib/telegram/bot";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { symbol, action, quantity, userId } = body;

    if (!symbol || !action || !quantity || !userId) {
      return NextResponse.json(
        { error: "Missing required fields: symbol, action, quantity, userId" },
        { status: 400 }
      );
    }

    if (!["BUY", "SELL"].includes(action)) {
      return NextResponse.json(
        { error: "Action must be BUY or SELL" },
        { status: 400 }
      );
    }

    // Get current price
    const quote = await broker.getQuote(symbol);
    const price = quote.price;

    // Run risk checks
    const riskCheck = await checkRiskLimits({
      symbol,
      action,
      quantity,
      price,
      userId,
    });

    if (!riskCheck.allowed) {
      await sendRiskAlert(riskCheck.riskType || "UNKNOWN", riskCheck.reason || "Trade blocked");

      // Still log the attempted trade
      await prisma.trade.create({
        data: {
          symbol,
          action,
          quantity,
          price,
          totalValue: quantity * price,
          reasoning: `BLOCKED: ${riskCheck.reason}`,
          status: "CANCELLED",
          paperTrade: broker.getTradingMode() === "paper",
          userId,
        },
      });

      return NextResponse.json(
        { error: riskCheck.reason, riskType: riskCheck.riskType },
        { status: 403 }
      );
    }

    // Execute through broker bridge
    const order = await broker.submitOrder({
      symbol,
      qty: quantity,
      side: action.toLowerCase() as "buy" | "sell",
      currentPrice: price,
    });

    // Record in database
    const trade = await prisma.trade.create({
      data: {
        symbol,
        action,
        quantity,
        price: order.filledAvgPrice || price,
        totalValue: quantity * (order.filledAvgPrice || price),
        confidence: body.confidence || 0,
        reasoning: body.reasoning || "Manual trade",
        status: "EXECUTED",
        paperTrade: broker.getTradingMode() === "paper",
        brokerId: order.id,
        userId,
        executedAt: new Date(),
      },
    });

    // Update asset positions in DB
    await updateAssetPosition(
      userId,
      symbol,
      action,
      quantity,
      order.filledAvgPrice || price
    );

    // Send Telegram alert
    await sendTradeAlert({
      action,
      symbol,
      quantity,
      price: order.filledAvgPrice || price,
      confidence: body.confidence || 0,
      reasoning: body.reasoning || "Manual trade",
      paperTrade: broker.getTradingMode() === "paper",
    });

    return NextResponse.json({ trade, order });
  } catch (error) {
    console.error("Trade execution error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Trade execution failed" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const limit = parseInt(searchParams.get("limit") || "50");

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  const trades = await prisma.trade.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return NextResponse.json({ trades });
}

async function updateAssetPosition(
  userId: string,
  symbol: string,
  action: string,
  quantity: number,
  price: number
) {
  const existing = await prisma.asset.findUnique({
    where: { symbol_userId: { symbol, userId } },
  });

  if (action === "BUY") {
    if (existing) {
      const newTotalCost = existing.avgCost * existing.quantity + price * quantity;
      const newQuantity = existing.quantity + quantity;
      await prisma.asset.update({
        where: { id: existing.id },
        data: {
          quantity: newQuantity,
          avgCost: newTotalCost / newQuantity,
        },
      });
    } else {
      await prisma.asset.create({
        data: { symbol, name: symbol, quantity, avgCost: price, userId },
      });
    }
  } else if (action === "SELL" && existing) {
    const newQuantity = existing.quantity - quantity;
    if (newQuantity <= 0) {
      await prisma.asset.delete({ where: { id: existing.id } });
    } else {
      await prisma.asset.update({
        where: { id: existing.id },
        data: { quantity: newQuantity },
      });
    }
  }
}
