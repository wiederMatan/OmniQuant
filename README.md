# OmniQuant

Autonomous AI-powered trading engine. Paper trading by default.

## Stack

Next.js 16, TypeScript, Tailwind CSS, Prisma (SQLite), Claude AI, Recharts, Telegram Bot.

## Setup

```bash
cp .env.example .env   # Add your API keys
npm install
npm run db:push
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Pages

- `/` — Dashboard (portfolio, kill switch, AI thought stream, trades)
- `/audit` — Audit trail (AI logs, risk events, trade history)
- `/settings` — Risk limits and API key management

## Docker

```bash
docker compose up -d
```

## Key Features

- **Paper trading** mode by default — no real money at risk
- **AI Decision Engine** — Claude analyzes sentiment + technicals, outputs BUY/SELL/HOLD with confidence
- **Hard risk limits** — max per-trade, daily drawdown, position size enforced before every trade
- **AES-256 encryption** for all stored API keys
- **Telegram bot** — /status, /balance, /stop_all commands + trade alerts
- **Kill switch** — instantly halt all trading from dashboard or Telegram
