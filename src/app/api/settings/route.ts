import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { encrypt, decrypt, isEncrypted } from "@/lib/crypto/encryption";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  const settings = await prisma.settings.findUnique({ where: { userId } });

  if (!settings) {
    return NextResponse.json({ settings: null });
  }

  // Return settings with masked API keys
  return NextResponse.json({
    settings: {
      ...settings,
      alpacaApiKey: settings.alpacaApiKey ? "••••••••" : null,
      alpacaApiSecret: settings.alpacaApiSecret ? "••••••••" : null,
      anthropicApiKey: settings.anthropicApiKey ? "••••••••" : null,
      newsApiKey: settings.newsApiKey ? "••••••••" : null,
      telegramBotToken: settings.telegramBotToken ? "••••••••" : null,
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, ...data } = body;

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    // Encrypt sensitive fields before storing
    const sensitiveFields = [
      "alpacaApiKey",
      "alpacaApiSecret",
      "anthropicApiKey",
      "newsApiKey",
      "telegramBotToken",
    ] as const;

    const processedData: Record<string, unknown> = { ...data };

    for (const field of sensitiveFields) {
      if (processedData[field] && typeof processedData[field] === "string") {
        const value = processedData[field] as string;
        // Don't re-encrypt masked values or already encrypted values
        if (value !== "••••••••" && !isEncrypted(value)) {
          processedData[field] = encrypt(value);
        } else if (value === "••••••••") {
          // Remove masked values so we don't overwrite
          delete processedData[field];
        }
      }
    }

    const settings = await prisma.settings.upsert({
      where: { userId },
      update: processedData,
      create: {
        userId,
        ...processedData,
      },
    });

    return NextResponse.json({
      settings: {
        ...settings,
        alpacaApiKey: settings.alpacaApiKey ? "••••••••" : null,
        alpacaApiSecret: settings.alpacaApiSecret ? "••••••••" : null,
        anthropicApiKey: settings.anthropicApiKey ? "••••••••" : null,
        newsApiKey: settings.newsApiKey ? "••••••••" : null,
        telegramBotToken: settings.telegramBotToken ? "••••••••" : null,
      },
    });
  } catch (error) {
    console.error("Settings update error:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}

// Decrypt a specific API key (for internal use by services)
export async function getDecryptedApiKey(
  userId: string,
  keyField: "alpacaApiKey" | "alpacaApiSecret" | "anthropicApiKey" | "newsApiKey" | "telegramBotToken"
): Promise<string | null> {
  const settings = await prisma.settings.findUnique({ where: { userId } });

  if (!settings || !settings[keyField]) return null;

  try {
    return decrypt(settings[keyField]);
  } catch {
    return null;
  }
}
