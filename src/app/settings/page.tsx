"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Settings, Key, Shield, Save, Loader2 } from "lucide-react";

const USER_ID = "default-user";

interface SettingsData {
  tradingEnabled: boolean;
  paperTrading: boolean;
  maxTradeAmount: number;
  maxDailyDrawdown: number;
  maxPositionSize: number;
  riskTolerancePct: number;
  stopLossPct: number;
  takeProfitPct: number;
  analyzedSymbols: string;
  analysisIntervalMins: number;
  alpacaApiKey: string | null;
  alpacaApiSecret: string | null;
  anthropicApiKey: string | null;
  newsApiKey: string | null;
  telegramBotToken: string | null;
  telegramUserId: string | null;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Form state for API keys (separate so we only send non-masked values)
  const [apiKeys, setApiKeys] = useState({
    alpacaApiKey: "",
    alpacaApiSecret: "",
    anthropicApiKey: "",
    newsApiKey: "",
    telegramBotToken: "",
    telegramUserId: "",
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch(`/api/settings?userId=${USER_ID}`);
        if (res.ok) {
          const data = await res.json();
          if (data.settings) {
            setSettings(data.settings);
            setApiKeys({
              alpacaApiKey: "",
              alpacaApiSecret: "",
              anthropicApiKey: "",
              newsApiKey: "",
              telegramBotToken: "",
              telegramUserId: data.settings.telegramUserId || "",
            });
          }
        }
      } catch (error) {
        console.error("Failed to fetch settings:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const payload: Record<string, unknown> = {
        userId: USER_ID,
      };

      if (settings) {
        payload.tradingEnabled = settings.tradingEnabled;
        payload.paperTrading = settings.paperTrading;
        payload.maxTradeAmount = settings.maxTradeAmount;
        payload.maxDailyDrawdown = settings.maxDailyDrawdown;
        payload.maxPositionSize = settings.maxPositionSize;
        payload.riskTolerancePct = settings.riskTolerancePct;
        payload.stopLossPct = settings.stopLossPct;
        payload.takeProfitPct = settings.takeProfitPct;
        payload.analyzedSymbols = settings.analyzedSymbols;
        payload.analysisIntervalMins = settings.analysisIntervalMins;
      }

      // Only include API keys if they've been changed (non-empty)
      if (apiKeys.alpacaApiKey) payload.alpacaApiKey = apiKeys.alpacaApiKey;
      if (apiKeys.alpacaApiSecret) payload.alpacaApiSecret = apiKeys.alpacaApiSecret;
      if (apiKeys.anthropicApiKey) payload.anthropicApiKey = apiKeys.anthropicApiKey;
      if (apiKeys.newsApiKey) payload.newsApiKey = apiKeys.newsApiKey;
      if (apiKeys.telegramBotToken) payload.telegramBotToken = apiKeys.telegramBotToken;
      if (apiKeys.telegramUserId) payload.telegramUserId = apiKeys.telegramUserId;

      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings);
        setMessage("Settings saved successfully.");
        // Clear API key fields after save
        setApiKeys((prev) => ({
          ...prev,
          alpacaApiKey: "",
          alpacaApiSecret: "",
          anthropicApiKey: "",
          newsApiKey: "",
          telegramBotToken: "",
        }));
      } else {
        setMessage("Failed to save settings.");
      }
    } catch (error) {
      setMessage("Error saving settings.");
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-emerald-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="h-6 w-6" />
          Settings
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Configure your trading engine, risk limits, and API keys.
        </p>
      </div>

      {message && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3 text-sm text-zinc-300">
          {message}
        </div>
      )}

      {/* Risk Limits */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-5 w-5 text-red-400" />
            Risk Limits
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-zinc-500">Max Per-Trade Amount ($)</label>
              <input
                type="number"
                className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
                value={settings?.maxTradeAmount ?? 1000}
                onChange={(e) =>
                  setSettings((s) => s ? { ...s, maxTradeAmount: parseFloat(e.target.value) } : s)
                }
              />
            </div>
            <div>
              <label className="text-xs text-zinc-500">Max Daily Drawdown ($)</label>
              <input
                type="number"
                className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
                value={settings?.maxDailyDrawdown ?? 5000}
                onChange={(e) =>
                  setSettings((s) => s ? { ...s, maxDailyDrawdown: parseFloat(e.target.value) } : s)
                }
              />
            </div>
            <div>
              <label className="text-xs text-zinc-500">Max Position Size ($)</label>
              <input
                type="number"
                className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
                value={settings?.maxPositionSize ?? 10000}
                onChange={(e) =>
                  setSettings((s) => s ? { ...s, maxPositionSize: parseFloat(e.target.value) } : s)
                }
              />
            </div>
            <div>
              <label className="text-xs text-zinc-500">Risk Tolerance (%)</label>
              <input
                type="number"
                step="0.5"
                className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
                value={settings?.riskTolerancePct ?? 2}
                onChange={(e) =>
                  setSettings((s) => s ? { ...s, riskTolerancePct: parseFloat(e.target.value) } : s)
                }
              />
            </div>
            <div>
              <label className="text-xs text-zinc-500">Stop Loss (%)</label>
              <input
                type="number"
                step="0.5"
                className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
                value={settings?.stopLossPct ?? 5}
                onChange={(e) =>
                  setSettings((s) => s ? { ...s, stopLossPct: parseFloat(e.target.value) } : s)
                }
              />
            </div>
            <div>
              <label className="text-xs text-zinc-500">Take Profit (%)</label>
              <input
                type="number"
                step="0.5"
                className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
                value={settings?.takeProfitPct ?? 10}
                onChange={(e) =>
                  setSettings((s) => s ? { ...s, takeProfitPct: parseFloat(e.target.value) } : s)
                }
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-zinc-500">Analyzed Symbols (comma-separated)</label>
            <input
              type="text"
              className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
              value={settings?.analyzedSymbols ?? "AAPL,GOOGL,MSFT,AMZN,TSLA"}
              onChange={(e) =>
                setSettings((s) => s ? { ...s, analyzedSymbols: e.target.value } : s)
              }
            />
          </div>

          <div>
            <label className="text-xs text-zinc-500">Analysis Interval (minutes)</label>
            <input
              type="number"
              className="mt-1 w-full max-w-xs rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
              value={settings?.analysisIntervalMins ?? 30}
              onChange={(e) =>
                setSettings((s) => s ? { ...s, analysisIntervalMins: parseInt(e.target.value) } : s)
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* API Keys */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Key className="h-5 w-5 text-yellow-400" />
            API Keys
            <Badge variant="outline" className="ml-2">
              AES-256 Encrypted
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-zinc-500">
            Keys are encrypted with AES-256-GCM before storage. Leave blank to keep existing values.
          </p>

          <div className="space-y-3">
            <div>
              <label className="text-xs text-zinc-500">Alpaca API Key</label>
              <input
                type="password"
                className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
                placeholder={settings?.alpacaApiKey ? "••••••••" : "Enter API key"}
                value={apiKeys.alpacaApiKey}
                onChange={(e) => setApiKeys((k) => ({ ...k, alpacaApiKey: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs text-zinc-500">Alpaca API Secret</label>
              <input
                type="password"
                className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
                placeholder={settings?.alpacaApiSecret ? "••••••••" : "Enter API secret"}
                value={apiKeys.alpacaApiSecret}
                onChange={(e) => setApiKeys((k) => ({ ...k, alpacaApiSecret: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs text-zinc-500">Anthropic (Claude) API Key</label>
              <input
                type="password"
                className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
                placeholder={settings?.anthropicApiKey ? "••••••••" : "Enter API key"}
                value={apiKeys.anthropicApiKey}
                onChange={(e) => setApiKeys((k) => ({ ...k, anthropicApiKey: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs text-zinc-500">NewsAPI Key</label>
              <input
                type="password"
                className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
                placeholder={settings?.newsApiKey ? "••••••••" : "Enter API key"}
                value={apiKeys.newsApiKey}
                onChange={(e) => setApiKeys((k) => ({ ...k, newsApiKey: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs text-zinc-500">Telegram Bot Token</label>
              <input
                type="password"
                className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
                placeholder={settings?.telegramBotToken ? "••••••••" : "Enter bot token"}
                value={apiKeys.telegramBotToken}
                onChange={(e) => setApiKeys((k) => ({ ...k, telegramBotToken: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs text-zinc-500">Telegram User ID</label>
              <input
                type="text"
                className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
                placeholder="Enter your Telegram user ID"
                value={apiKeys.telegramUserId}
                onChange={(e) => setApiKeys((k) => ({ ...k, telegramUserId: e.target.value }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} size="lg">
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Settings
        </Button>
      </div>
    </div>
  );
}
