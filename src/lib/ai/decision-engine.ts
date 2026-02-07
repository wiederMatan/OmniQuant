import Anthropic from "@anthropic-ai/sdk";
import type { TradeDecision, AnalysisContext } from "@/types";
import { buildMarketContext } from "./market-brain";
import prisma from "@/lib/db";

const SYSTEM_PROMPT = `You are an autonomous trading AI analyst. Your role is to analyze market data, news sentiment, and technical indicators to make trading decisions.

You must respond ONLY with valid JSON in this exact format:
{
  "action": "BUY" | "SELL" | "HOLD",
  "symbol": "<ticker>",
  "confidence": <0.0 to 1.0>,
  "reasoning": "<detailed explanation of your analysis>",
  "suggestedQuantity": <number of shares>,
  "sentiment": <-1.0 to 1.0>,
  "technicalScore": <-1.0 to 1.0>
}

Decision guidelines:
- BUY: Strong positive sentiment + upward technical momentum + confidence > 0.6
- SELL: Strong negative sentiment + downward technical momentum + confidence > 0.6
- HOLD: Mixed signals, low confidence, or when risk limits would be exceeded
- NEVER recommend buying more than the risk limits allow
- Be conservative by default. When in doubt, HOLD.
- Factor in position size - don't recommend increasing an already large position
- Consider recent trade history to avoid whipsawing (rapid buy/sell cycles)

You must ALWAYS output valid JSON. No markdown, no code fences, just raw JSON.`;

function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }
  return new Anthropic({ apiKey });
}

export async function analyzeAndDecide(
  context: AnalysisContext,
  userId: string
): Promise<TradeDecision> {
  const startTime = Date.now();
  const sessionId = `session-${Date.now()}`;
  const client = getClient();

  const marketContext = buildMarketContext(context.marketData, context.news);

  const positionInfo = context.currentPosition
    ? `\n## Current Position in ${context.symbol}\n- Shares: ${context.currentPosition.quantity}\n- Average Cost: $${context.currentPosition.avgCost.toFixed(2)}\n- Market Value: $${(context.currentPosition.quantity * context.marketData.price).toFixed(2)}\n- Unrealized P/L: $${((context.marketData.price - context.currentPosition.avgCost) * context.currentPosition.quantity).toFixed(2)}`
    : `\n## Current Position in ${context.symbol}\nNo current position.`;

  const tradeHistory =
    context.recentTrades.length > 0
      ? `\n## Recent Trades\n${context.recentTrades
          .slice(0, 5)
          .map((t) => `- ${t.action} at $${t.price.toFixed(2)} on ${t.date}`)
          .join("\n")}`
      : "\n## Recent Trades\nNo recent trades.";

  const riskInfo = `\n## Risk Limits\n- Max per trade: $${context.riskLimits.maxTradeAmount}\n- Max position size: $${context.riskLimits.maxPositionSize}\n- Risk tolerance: ${context.riskLimits.riskTolerancePct}% of portfolio`;

  const userPrompt = `Analyze the following and provide your trading decision:\n${marketContext}${positionInfo}${tradeHistory}${riskInfo}`;

  try {
    const response = await client.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });

    const content = response.content[0];
    const rawText = content.type === "text" ? content.text : "";
    const durationMs = Date.now() - startTime;

    // Parse the JSON response
    let decision: TradeDecision;
    try {
      const parsed = JSON.parse(rawText);
      decision = {
        action: parsed.action || "HOLD",
        symbol: parsed.symbol || context.symbol,
        confidence: Math.max(0, Math.min(1, parsed.confidence || 0)),
        reasoning: parsed.reasoning || "No reasoning provided",
        suggestedQuantity: parsed.suggestedQuantity,
        sentiment: parsed.sentiment,
        technicalScore: parsed.technicalScore,
      };
    } catch {
      // If JSON parsing fails, default to HOLD
      decision = {
        action: "HOLD",
        symbol: context.symbol,
        confidence: 0,
        reasoning: `Failed to parse AI response. Raw: ${rawText.slice(0, 200)}`,
      };
    }

    // Log to AILog table
    await prisma.aILog.create({
      data: {
        sessionId,
        prompt: userPrompt,
        response: rawText,
        model: "claude-3-5-sonnet-20241022",
        tokensUsed:
          (response.usage?.input_tokens || 0) +
          (response.usage?.output_tokens || 0),
        decision: JSON.stringify(decision),
        sentiment: decision.sentiment,
        confidence: decision.confidence,
        symbols: context.symbol,
        durationMs,
        userId,
      },
    });

    return decision;
  } catch (error) {
    const durationMs = Date.now() - startTime;

    // Log the error
    await prisma.aILog.create({
      data: {
        sessionId,
        prompt: userPrompt,
        response: `ERROR: ${error instanceof Error ? error.message : "Unknown error"}`,
        model: "claude-3-5-sonnet-20241022",
        decision: JSON.stringify({ action: "HOLD", symbol: context.symbol, confidence: 0, reasoning: "Error during analysis" }),
        durationMs,
        userId,
      },
    });

    return {
      action: "HOLD",
      symbol: context.symbol,
      confidence: 0,
      reasoning: `Analysis failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}
