import type { BrokerAccount } from "@/types";

const TELEGRAM_API = "https://api.telegram.org/bot";

function getConfig() {
  return {
    token: process.env.TELEGRAM_BOT_TOKEN || "",
    userId: process.env.TELEGRAM_USER_ID || "",
  };
}

function isAuthorized(chatId: string | number): boolean {
  const config = getConfig();
  return String(chatId) === config.userId;
}

export async function sendMessage(
  text: string,
  parseMode: "HTML" | "Markdown" = "HTML"
): Promise<boolean> {
  const config = getConfig();
  if (!config.token || !config.userId) {
    console.warn("Telegram not configured, skipping message");
    return false;
  }

  try {
    const response = await fetch(`${TELEGRAM_API}${config.token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: config.userId,
        text,
        parse_mode: parseMode,
      }),
    });

    return response.ok;
  } catch (error) {
    console.error("Telegram send failed:", error);
    return false;
  }
}

export async function sendTradeAlert(params: {
  action: "BUY" | "SELL" | "HOLD";
  symbol: string;
  quantity: number;
  price: number;
  confidence: number;
  reasoning: string;
  paperTrade: boolean;
}): Promise<void> {
  const emoji = params.action === "BUY" ? "🟢" : params.action === "SELL" ? "🔴" : "⚪";
  const mode = params.paperTrade ? "📝 PAPER" : "💰 LIVE";

  const message = `${emoji} <b>${params.action} ${params.symbol}</b>

${mode} TRADE
━━━━━━━━━━━━━━━
Qty: <b>${params.quantity}</b>
Price: <b>$${params.price.toFixed(2)}</b>
Total: <b>$${(params.quantity * params.price).toFixed(2)}</b>
Confidence: <b>${(params.confidence * 100).toFixed(0)}%</b>

<i>${params.reasoning}</i>`;

  await sendMessage(message);
}

export async function sendStatusUpdate(account: BrokerAccount): Promise<void> {
  const dailyChange = account.equity - account.lastEquity;
  const dailyPct = account.lastEquity
    ? ((dailyChange / account.lastEquity) * 100).toFixed(2)
    : "0.00";
  const arrow = dailyChange >= 0 ? "📈" : "📉";

  const message = `${arrow} <b>Portfolio Status</b>

━━━━━━━━━━━━━━━
Equity: <b>$${account.equity.toFixed(2)}</b>
Cash: <b>$${account.cash.toFixed(2)}</b>
Day P/L: <b>$${dailyChange.toFixed(2)} (${dailyPct}%)</b>
Buying Power: <b>$${account.buyingPower.toFixed(2)}</b>
Long Value: <b>$${account.longMarketValue.toFixed(2)}</b>`;

  await sendMessage(message);
}

export async function sendRiskAlert(
  riskType: string,
  description: string
): Promise<void> {
  const message = `🚨 <b>RISK ALERT</b>

Type: <b>${riskType}</b>
━━━━━━━━━━━━━━━
${description}`;

  await sendMessage(message);
}

export async function handleCommand(
  chatId: string | number,
  command: string
): Promise<string> {
  if (!isAuthorized(chatId)) {
    return "⛔ Unauthorized. This bot is private.";
  }

  switch (command) {
    case "/start":
      return "🤖 OmniQuant Trading Bot\n\nCommands:\n/status - Portfolio status\n/balance - Account balance\n/stop_all - Emergency stop";
    case "/status":
      return "STATUS_REQUEST";
    case "/balance":
      return "BALANCE_REQUEST";
    case "/stop_all":
      return "STOP_ALL_REQUEST";
    default:
      return "Unknown command. Use /start for help.";
  }
}
