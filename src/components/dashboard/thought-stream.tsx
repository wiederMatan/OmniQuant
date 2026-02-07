"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, Clock } from "lucide-react";

interface AILogEntry {
  id: string;
  sessionId: string;
  decision: string | null;
  sentiment: number | null;
  confidence: number | null;
  symbols: string | null;
  durationMs: number;
  createdAt: string;
  response: string;
}

interface ThoughtStreamProps {
  userId: string;
}

export function ThoughtStream({ userId }: ThoughtStreamProps) {
  const [logs, setLogs] = useState<AILogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await fetch(
          `/api/analysis?userId=${userId}&limit=10`
        );
        if (res.ok) {
          const data = await res.json();
          setLogs(data.logs || []);
        }
      } catch (error) {
        console.error("Failed to fetch AI logs:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
    const interval = setInterval(fetchLogs, 15000); // Refresh every 15s
    return () => clearInterval(interval);
  }, [userId]);

  const getActionBadge = (decision: string | null) => {
    if (!decision) return null;
    try {
      const parsed = JSON.parse(decision);
      const action = parsed.action;
      const variant =
        action === "BUY" ? "success" : action === "SELL" ? "destructive" : "secondary";
      return <Badge variant={variant}>{action}</Badge>;
    } catch {
      return null;
    }
  };

  const getConfidenceBar = (confidence: number | null) => {
    if (confidence === null) return null;
    const pct = Math.round(confidence * 100);
    const color =
      pct > 70 ? "bg-green-500" : pct > 40 ? "bg-yellow-500" : "bg-red-500";

    return (
      <div className="flex items-center gap-2">
        <div className="h-1.5 w-20 rounded-full bg-zinc-700">
          <div
            className={`h-1.5 rounded-full ${color}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-xs text-zinc-400">{pct}%</span>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-purple-400" />
          AI Thought Stream
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-700 border-t-purple-400" />
          </div>
        ) : logs.length === 0 ? (
          <p className="py-8 text-center text-sm text-zinc-500">
            No analysis logs yet. Run an analysis to see the AI&apos;s reasoning.
          </p>
        ) : (
          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
            {logs.map((log) => {
              let reasoning = "";
              try {
                const parsed = JSON.parse(log.decision || "{}");
                reasoning = parsed.reasoning || "";
              } catch {
                reasoning = "";
              }

              return (
                <div
                  key={log.id}
                  className="rounded-lg border border-zinc-800 bg-zinc-950 p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-zinc-300">
                        {log.symbols || "Unknown"}
                      </span>
                      {getActionBadge(log.decision)}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                      <Clock className="h-3 w-3" />
                      {new Date(log.createdAt).toLocaleTimeString()}
                      <span className="text-zinc-600">
                        {log.durationMs}ms
                      </span>
                    </div>
                  </div>

                  {getConfidenceBar(log.confidence)}

                  {reasoning && (
                    <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
                      {reasoning}
                    </p>
                  )}

                  {log.sentiment !== null && (
                    <div className="mt-2 flex items-center gap-4 text-xs text-zinc-500">
                      <span>
                        Sentiment:{" "}
                        <span
                          className={
                            log.sentiment > 0
                              ? "text-green-400"
                              : log.sentiment < 0
                                ? "text-red-400"
                                : "text-zinc-400"
                          }
                        >
                          {log.sentiment > 0 ? "+" : ""}
                          {log.sentiment.toFixed(2)}
                        </span>
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
