"use client";

import { useEffect, useState, useCallback } from "react";
import { PortfolioCard } from "@/components/dashboard/portfolio-card";
import { KillSwitch } from "@/components/dashboard/kill-switch";
import { ThoughtStream } from "@/components/dashboard/thought-stream";
import { TradeHistory } from "@/components/dashboard/trade-history";
import { PerformanceChart } from "@/components/dashboard/performance-chart";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Play, Loader2 } from "lucide-react";

// Default user ID for single-user mode
const USER_ID = "default-user";

interface PortfolioData {
  totalValue: number;
  cashBalance: number;
  investedValue: number;
  dailyPnL: number;
  dailyPnLPercent: number;
  totalPnL: number;
  totalPnLPercent: number;
  positions: Array<{
    symbol: string;
    name: string;
    quantity: number;
    avgCost: number;
    currentPrice: number;
    marketValue: number;
    unrealizedPnL: number;
    unrealizedPnLPercent: number;
  }>;
  tradingMode: "paper" | "live";
}

export default function Dashboard() {
  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null);
  const [tradingEnabled, setTradingEnabled] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPortfolio = useCallback(async () => {
    try {
      const res = await fetch("/api/portfolio");
      if (res.ok) {
        const data = await res.json();
        setPortfolio(data);
      }
    } catch (error) {
      console.error("Failed to fetch portfolio:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch(`/api/settings?userId=${USER_ID}`);
      if (res.ok) {
        const data = await res.json();
        setTradingEnabled(data.settings?.tradingEnabled ?? false);
      }
    } catch (error) {
      console.error("Failed to fetch settings:", error);
    }
  }, []);

  useEffect(() => {
    fetchPortfolio();
    fetchSettings();
    const interval = setInterval(fetchPortfolio, 30000);
    return () => clearInterval(interval);
  }, [fetchPortfolio, fetchSettings]);

  const handleKillSwitch = async (enabled: boolean) => {
    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: USER_ID, tradingEnabled: enabled }),
      });
      setTradingEnabled(enabled);
    } catch (error) {
      console.error("Failed to toggle trading:", error);
    }
  };

  const runAnalysis = async (symbol: string) => {
    setAnalyzing(true);
    setAnalysisResult(null);
    try {
      const res = await fetch("/api/analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol, userId: USER_ID }),
      });

      if (res.ok) {
        const data = await res.json();
        setAnalysisResult(
          `${data.decision.action} ${symbol} (${(data.decision.confidence * 100).toFixed(0)}% confidence): ${data.decision.reasoning}`
        );
      } else {
        const error = await res.json();
        setAnalysisResult(`Error: ${error.error}`);
      }
    } catch (error) {
      setAnalysisResult(
        `Error: ${error instanceof Error ? error.message : "Analysis failed"}`
      );
    } finally {
      setAnalyzing(false);
    }
  };

  const symbols = ["AAPL", "GOOGL", "MSFT", "AMZN", "TSLA"];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-emerald-400 mx-auto" />
          <p className="mt-4 text-sm text-zinc-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Row: Portfolio + Kill Switch */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PortfolioCard
          totalValue={portfolio?.totalValue ?? 100000}
          cashBalance={portfolio?.cashBalance ?? 100000}
          investedValue={portfolio?.investedValue ?? 0}
          dailyPnL={portfolio?.dailyPnL ?? 0}
          dailyPnLPercent={portfolio?.dailyPnLPercent ?? 0}
          totalPnL={portfolio?.totalPnL ?? 0}
          tradingMode={portfolio?.tradingMode ?? "paper"}
        />
        <KillSwitch
          tradingEnabled={tradingEnabled}
          onToggle={handleKillSwitch}
        />
      </div>

      {/* Quick Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-zinc-400">
            Quick Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {symbols.map((symbol) => (
              <Button
                key={symbol}
                variant="outline"
                size="sm"
                onClick={() => runAnalysis(symbol)}
                disabled={analyzing}
              >
                {analyzing ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Play className="h-3 w-3" />
                )}
                {symbol}
              </Button>
            ))}
          </div>
          {analysisResult && (
            <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-950 p-3">
              <p className="text-sm text-zinc-300">{analysisResult}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Performance Chart */}
      <PerformanceChart data={[]} />

      {/* Positions */}
      {portfolio && portfolio.positions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-zinc-400">
              Open Positions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 text-left text-xs text-zinc-500">
                    <th className="pb-2">Symbol</th>
                    <th className="pb-2">Qty</th>
                    <th className="pb-2">Avg Cost</th>
                    <th className="pb-2">Current</th>
                    <th className="pb-2">Value</th>
                    <th className="pb-2">P/L</th>
                  </tr>
                </thead>
                <tbody>
                  {portfolio.positions.map((pos) => (
                    <tr
                      key={pos.symbol}
                      className="border-b border-zinc-800/50"
                    >
                      <td className="py-2 font-medium">{pos.symbol}</td>
                      <td className="py-2">{pos.quantity}</td>
                      <td className="py-2">${pos.avgCost.toFixed(2)}</td>
                      <td className="py-2">${pos.currentPrice.toFixed(2)}</td>
                      <td className="py-2">${pos.marketValue.toFixed(2)}</td>
                      <td className="py-2">
                        <Badge
                          variant={
                            pos.unrealizedPnL >= 0 ? "success" : "destructive"
                          }
                        >
                          ${pos.unrealizedPnL.toFixed(2)}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bottom Row: Thought Stream + Trade History */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ThoughtStream userId={USER_ID} />
        <TradeHistory userId={USER_ID} />
      </div>
    </div>
  );
}
