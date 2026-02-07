import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Create default user
  const user = await prisma.user.upsert({
    where: { email: "admin@omniquant.local" },
    update: {},
    create: {
      id: "default-user",
      email: "admin@omniquant.local",
      name: "OmniQuant Admin",
    },
  });

  console.log("Created default user:", user.id);

  // Create default settings
  const settings = await prisma.settings.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      tradingEnabled: false,
      paperTrading: true,
      maxTradeAmount: 1000,
      maxDailyDrawdown: 5000,
      maxPositionSize: 10000,
      riskTolerancePct: 2,
      stopLossPct: 5,
      takeProfitPct: 10,
      analyzedSymbols: "AAPL,GOOGL,MSFT,AMZN,TSLA",
      analysisIntervalMins: 30,
    },
  });

  console.log("Created default settings:", settings.id);
  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
