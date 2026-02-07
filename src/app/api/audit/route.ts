import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getRiskEvents } from "@/lib/risk";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const type = searchParams.get("type"); // "ai_logs" | "risk_events" | "trades"
  const limit = parseInt(searchParams.get("limit") || "50");

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  try {
    switch (type) {
      case "risk_events": {
        const events = await getRiskEvents(limit);
        return NextResponse.json({ events });
      }

      case "trades": {
        const trades = await prisma.trade.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
          take: limit,
        });
        return NextResponse.json({ trades });
      }

      case "ai_logs":
      default: {
        const logs = await prisma.aILog.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
          take: limit,
        });
        return NextResponse.json({ logs });
      }
    }
  } catch (error) {
    console.error("Audit fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch audit data" },
      { status: 500 }
    );
  }
}
