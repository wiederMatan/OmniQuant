"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { History } from "lucide-react";

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
  executedAt: string | null;
  createdAt: string;
}

interface TradeHistoryProps {
  userId: string;
}

export function TradeHistory({ userId }: TradeHistoryProps) {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrades = async () => {
      try {
        const res = await fetch(`/api/trading?userId=${userId}&limit=20`);
        if (res.ok) {
          const data = await res.json();
          setTrades(data.trades || []);
        }
      } catch (error) {
        console.error("Failed to fetch trades:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTrades();
  }, [userId]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "EXECUTED":
        return <Badge variant="success">Executed</Badge>;
      case "PENDING":
        return <Badge variant="warning">Pending</Badge>;
      case "FAILED":
        return <Badge variant="destructive">Failed</Badge>;
      case "CANCELLED":
        return <Badge variant="outline">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5 text-blue-400" />
          Trade History
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-700 border-t-blue-400" />
          </div>
        ) : trades.length === 0 ? (
          <p className="py-8 text-center text-sm text-zinc-500">
            No trades yet.
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
                  <th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {trades.map((trade) => (
                  <tr
                    key={trade.id}
                    className="border-b border-zinc-800/50 hover:bg-zinc-800/30"
                  >
                    <td className="py-2 text-zinc-400">
                      {formatDate(trade.executedAt || trade.createdAt)}
                    </td>
                    <td className="py-2 font-medium">{trade.symbol}</td>
                    <td className="py-2">
                      <Badge
                        variant={
                          trade.action === "BUY" ? "success" : "destructive"
                        }
                      >
                        {trade.action}
                      </Badge>
                    </td>
                    <td className="py-2">{trade.quantity}</td>
                    <td className="py-2">{formatCurrency(trade.price)}</td>
                    <td className="py-2">{formatCurrency(trade.totalValue)}</td>
                    <td className="py-2">{getStatusBadge(trade.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
