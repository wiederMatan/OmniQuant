import type { RiskCheckResult } from "@/types";
import prisma from "@/lib/db";

interface TradeRequest {
  symbol: string;
  action: "BUY" | "SELL";
  quantity: number;
  price: number;
  userId: string;
}

/**
 * Hard Risk Limits - These cannot be overridden by the AI.
 * Every trade must pass all checks before execution.
 */

export async function checkRiskLimits(
  trade: TradeRequest
): Promise<RiskCheckResult> {
  const settings = await prisma.settings.findUnique({
    where: { userId: trade.userId },
  });

  if (!settings) {
    return { allowed: false, reason: "No settings found for user", riskType: "CONFIG" };
  }

  // Check 1: Is trading enabled?
  if (!settings.tradingEnabled) {
    await logRiskEvent("KILL_SWITCH", "Trading is disabled (Kill Switch active)", trade);
    return {
      allowed: false,
      reason: "Trading is disabled. Enable it from the dashboard.",
      riskType: "KILL_SWITCH",
    };
  }

  const tradeValue = trade.quantity * trade.price;

  // Check 2: Max trade amount
  if (tradeValue > settings.maxTradeAmount) {
    await logRiskEvent(
      "MAX_TRADE",
      `Trade value $${tradeValue.toFixed(2)} exceeds max $${settings.maxTradeAmount}`,
      trade
    );
    return {
      allowed: false,
      reason: `Trade value $${tradeValue.toFixed(2)} exceeds maximum allowed per-trade amount of $${settings.maxTradeAmount}`,
      riskType: "MAX_TRADE",
    };
  }

  // Check 3: Max position size
  if (trade.action === "BUY") {
    const existingAsset = await prisma.asset.findUnique({
      where: { symbol_userId: { symbol: trade.symbol, userId: trade.userId } },
    });

    const currentValue = (existingAsset?.quantity || 0) * (existingAsset?.avgCost || 0);
    const newTotalValue = currentValue + tradeValue;

    if (newTotalValue > settings.maxPositionSize) {
      await logRiskEvent(
        "POSITION_LIMIT",
        `New position size $${newTotalValue.toFixed(2)} would exceed max $${settings.maxPositionSize}`,
        trade
      );
      return {
        allowed: false,
        reason: `Total position in ${trade.symbol} would be $${newTotalValue.toFixed(2)}, exceeding max position size of $${settings.maxPositionSize}`,
        riskType: "POSITION_LIMIT",
      };
    }
  }

  // Check 4: Daily drawdown limit
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const dailyTrades = await prisma.trade.findMany({
    where: {
      userId: trade.userId,
      status: "EXECUTED",
      executedAt: { gte: startOfDay },
    },
  });

  const dailyLoss = dailyTrades.reduce((sum, t) => {
    if (t.action === "BUY") return sum - t.totalValue;
    if (t.action === "SELL") return sum + t.totalValue;
    return sum;
  }, 0);

  if (dailyLoss < -settings.maxDailyDrawdown) {
    await logRiskEvent(
      "DAILY_DRAWDOWN",
      `Daily drawdown $${Math.abs(dailyLoss).toFixed(2)} exceeds max $${settings.maxDailyDrawdown}`,
      trade
    );
    return {
      allowed: false,
      reason: `Daily drawdown limit reached. Loss today: $${Math.abs(dailyLoss).toFixed(2)}, limit: $${settings.maxDailyDrawdown}`,
      riskType: "DAILY_DRAWDOWN",
    };
  }

  return { allowed: true };
}

async function logRiskEvent(
  type: string,
  description: string,
  trade: TradeRequest
): Promise<void> {
  await prisma.riskEvent.create({
    data: {
      type,
      description,
      blocked: true,
      tradeData: JSON.stringify(trade),
    },
  });
}

export async function getRiskEvents(limit = 50) {
  return prisma.riskEvent.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
