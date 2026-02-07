"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { TrendingUp, TrendingDown, DollarSign, Wallet } from "lucide-react";

interface PortfolioCardProps {
  totalValue: number;
  cashBalance: number;
  investedValue: number;
  dailyPnL: number;
  dailyPnLPercent: number;
  totalPnL: number;
  tradingMode: "paper" | "live";
}

export function PortfolioCard({
  totalValue,
  cashBalance,
  investedValue,
  dailyPnL,
  dailyPnLPercent,
  totalPnL,
  tradingMode,
}: PortfolioCardProps) {
  const isPositive = dailyPnL >= 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-zinc-400">
          Portfolio Value
        </CardTitle>
        <Badge variant={tradingMode === "paper" ? "warning" : "success"}>
          {tradingMode === "paper" ? "PAPER" : "LIVE"}
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{formatCurrency(totalValue)}</div>
        <div className="mt-1 flex items-center gap-2">
          {isPositive ? (
            <TrendingUp className="h-4 w-4 text-green-500" />
          ) : (
            <TrendingDown className="h-4 w-4 text-red-500" />
          )}
          <span className={isPositive ? "text-green-500" : "text-red-500"}>
            {formatCurrency(dailyPnL)} ({formatPercent(dailyPnLPercent)})
          </span>
          <span className="text-xs text-zinc-500">today</span>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-4">
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-zinc-400" />
            <div>
              <p className="text-xs text-zinc-500">Cash</p>
              <p className="text-sm font-medium">{formatCurrency(cashBalance)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-zinc-400" />
            <div>
              <p className="text-xs text-zinc-500">Invested</p>
              <p className="text-sm font-medium">{formatCurrency(investedValue)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {totalPnL >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
            <div>
              <p className="text-xs text-zinc-500">Total P/L</p>
              <p
                className={`text-sm font-medium ${totalPnL >= 0 ? "text-green-500" : "text-red-500"}`}
              >
                {formatCurrency(totalPnL)}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
