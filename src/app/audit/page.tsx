"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { ScrollText, Shield, History } from "lucide-react";

const USER_ID = "default-user";

type TabType = "ai_logs" | "risk_events" | "trades";

interface AILog {
  id: string;
  sessionId: string;
  prompt: string;
  response: string;
  model: string;
  tokensUsed: number;
  decision: string | null;
  sentiment: number | null;
  confidence: number | null;
  symbols: string | null;
  durationMs: number;
  createdAt: string;
}

interface RiskEvent {
  id: string;
  type: string;
  description: string;
  blocked: boolean;
  tradeData: string | null;
  createdAt: string;
}

interface Trade {
  id: string;
  symbol: string;
  action: string;
  quantity: number;
  price: number;
  totalValue: number;
  confidence: number;
  reasoning: string;
  status: string;
  paperTrade: boolean;
  createdAt: string;
}

export default function AuditPage() {
  const [tab, setTab] = useState<TabType>("ai_logs");
  const [aiLogs, setAiLogs] = useState<AILog[]>([]);
  const [riskEvents, setRiskEvents] = useState<RiskEvent[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/audit?userId=${USER_ID}&type=${tab}&limit=50`
        );
        if (res.ok) {
          const data = await res.json();
          if (tab === "ai_logs") setAiLogs(data.logs || []);
          else if (tab === "risk_events") setRiskEvents(data.events || []);
          else setTrades(data.trades || []);
        }
      } catch (error) {
        console.error("Failed to fetch audit data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [tab]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Audit Trail</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Complete transparency into every AI decision and trade execution.
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2">
        <Button
          variant={tab === "ai_logs" ? "default" : "outline"}
          size="sm"
          onClick={() => setTab("ai_logs")}
        >
          <ScrollText className="h-4 w-4 mr-1" />
          AI Logs
        </Button>
        <Button
          variant={tab === "risk_events" ? "default" : "outline"}
          size="sm"
          onClick={() => setTab("risk_events")}
        >
          <Shield className="h-4 w-4 mr-1" />
          Risk Events
        </Button>
        <Button
          variant={tab === "trades" ? "default" : "outline"}
          size="sm"
          onClick={() => setTab("trades")}
        >
          <History className="h-4 w-4 mr-1" />
          All Trades
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-700 border-t-emerald-400" />
        </div>
      ) : (
        <>
          {/* AI Logs Tab */}
          {tab === "ai_logs" && (
            <div className="space-y-3">
              {aiLogs.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-sm text-zinc-500">
                    No AI interaction logs yet.
                  </CardContent>
                </Card>
              ) : (
                aiLogs.map((log) => (
                  <Card key={log.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Badge variant="secondary">{log.symbols || "N/A"}</Badge>
                          <span className="text-zinc-400">
                            {log.model}
                          </span>
                          <span className="text-zinc-600">
                            {log.tokensUsed} tokens
                          </span>
                          <span className="text-zinc-600">
                            {log.durationMs}ms
                          </span>
                        </CardTitle>
                        <span className="text-xs text-zinc-500">
                          {formatDate(log.createdAt)}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {log.decision && (
                        <div className="mb-2">
                          <Badge
                            variant={
                              JSON.parse(log.decision).action === "BUY"
                                ? "success"
                                : JSON.parse(log.decision).action === "SELL"
                                  ? "destructive"
                                  : "secondary"
                            }
                          >
                            {JSON.parse(log.decision).action}
                          </Badge>
                          {log.confidence !== null && (
                            <span className="ml-2 text-xs text-zinc-400">
                              Confidence: {(log.confidence * 100).toFixed(0)}%
                            </span>
                          )}
                        </div>
                      )}

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setExpandedLog(
                            expandedLog === log.id ? null : log.id
                          )
                        }
                      >
                        {expandedLog === log.id
                          ? "Hide Raw Data"
                          : "Show Raw Data"}
                      </Button>

                      {expandedLog === log.id && (
                        <div className="mt-3 space-y-2">
                          <div>
                            <p className="text-xs font-medium text-zinc-500 mb-1">
                              Prompt:
                            </p>
                            <pre className="rounded bg-zinc-950 p-3 text-xs text-zinc-400 overflow-x-auto max-h-48 overflow-y-auto whitespace-pre-wrap">
                              {log.prompt}
                            </pre>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-zinc-500 mb-1">
                              Response:
                            </p>
                            <pre className="rounded bg-zinc-950 p-3 text-xs text-zinc-400 overflow-x-auto max-h-48 overflow-y-auto whitespace-pre-wrap">
                              {log.response}
                            </pre>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}

          {/* Risk Events Tab */}
          {tab === "risk_events" && (
            <div className="space-y-3">
              {riskEvents.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-sm text-zinc-500">
                    No risk events recorded. All trades passed risk checks.
                  </CardContent>
                </Card>
              ) : (
                riskEvents.map((event) => (
                  <Card
                    key={event.id}
                    className="border-red-900/50"
                  >
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="destructive">{event.type}</Badge>
                        <span className="text-xs text-zinc-500">
                          {formatDate(event.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm text-zinc-300">
                        {event.description}
                      </p>
                      {event.tradeData && (
                        <pre className="mt-2 rounded bg-zinc-950 p-2 text-xs text-zinc-500 overflow-x-auto">
                          {JSON.stringify(JSON.parse(event.tradeData), null, 2)}
                        </pre>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}

          {/* Trades Tab */}
          {tab === "trades" && (
            <Card>
              <CardContent className="pt-4">
                {trades.length === 0 ? (
                  <p className="py-8 text-center text-sm text-zinc-500">
                    No trades recorded yet.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-zinc-800 text-left text-xs text-zinc-500">
                          <th className="pb-2">Time</th>
                          <th className="pb-2">Symbol</th>
                          <th className="pb-2">Action</th>
                          <th className="pb-2">Qty</th>
                          <th className="pb-2">Price</th>
                          <th className="pb-2">Total</th>
                          <th className="pb-2">Confidence</th>
                          <th className="pb-2">Status</th>
                          <th className="pb-2">Mode</th>
                        </tr>
                      </thead>
                      <tbody>
                        {trades.map((trade) => (
                          <tr
                            key={trade.id}
                            className="border-b border-zinc-800/50"
                          >
                            <td className="py-2 text-zinc-400">
                              {formatDate(trade.createdAt)}
                            </td>
                            <td className="py-2 font-medium">{trade.symbol}</td>
                            <td className="py-2">
                              <Badge
                                variant={
                                  trade.action === "BUY"
                                    ? "success"
                                    : "destructive"
                                }
                              >
                                {trade.action}
                              </Badge>
                            </td>
                            <td className="py-2">{trade.quantity}</td>
                            <td className="py-2">${trade.price.toFixed(2)}</td>
                            <td className="py-2">
                              ${trade.totalValue.toFixed(2)}
                            </td>
                            <td className="py-2">
                              {(trade.confidence * 100).toFixed(0)}%
                            </td>
                            <td className="py-2">
                              <Badge
                                variant={
                                  trade.status === "EXECUTED"
                                    ? "success"
                                    : trade.status === "CANCELLED"
                                      ? "outline"
                                      : "warning"
                                }
                              >
                                {trade.status}
                              </Badge>
                            </td>
                            <td className="py-2">
                              <Badge
                                variant={
                                  trade.paperTrade ? "warning" : "success"
                                }
                              >
                                {trade.paperTrade ? "Paper" : "Live"}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
