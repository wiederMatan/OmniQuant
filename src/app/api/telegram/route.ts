import { NextRequest, NextResponse } from "next/server";
import { handleCommand, sendMessage, sendStatusUpdate } from "@/lib/telegram/bot";
import * as broker from "@/lib/broker";
import prisma from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const message = body.message;

    if (!message?.text || !message?.chat?.id) {
      return NextResponse.json({ ok: true });
    }

    const chatId = message.chat.id;
    const text = message.text.trim();

    const response = await handleCommand(chatId, text);

    switch (response) {
      case "STATUS_REQUEST": {
        const account = await broker.getAccount();
        await sendStatusUpdate(account);
        break;
      }

      case "BALANCE_REQUEST": {
        const account = await broker.getAccount();
        await sendMessage(
          `💰 <b>Balance</b>\n\nCash: <b>$${account.cash.toFixed(2)}</b>\nEquity: <b>$${account.equity.toFixed(2)}</b>\nBuying Power: <b>$${account.buyingPower.toFixed(2)}</b>\nMode: <b>${broker.getTradingMode().toUpperCase()}</b>`
        );
        break;
      }

      case "STOP_ALL_REQUEST": {
        // Cancel all orders
        await broker.cancelAllOrders();

        // Disable trading in settings
        await prisma.settings.updateMany({
          data: { tradingEnabled: false },
        });

        await sendMessage(
          "🛑 <b>EMERGENCY STOP</b>\n\nAll orders cancelled.\nTrading disabled.\n\nRe-enable from the dashboard."
        );
        break;
      }

      default:
        await sendMessage(response);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Telegram webhook error:", error);
    return NextResponse.json({ ok: true }); // Always return 200 to Telegram
  }
}
