"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldOff, ShieldCheck, Power } from "lucide-react";

interface KillSwitchProps {
  tradingEnabled: boolean;
  onToggle: (enabled: boolean) => void;
}

export function KillSwitch({ tradingEnabled, onToggle }: KillSwitchProps) {
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    setLoading(true);
    try {
      onToggle(!tradingEnabled);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className={tradingEnabled ? "border-green-800" : "border-red-800"}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-zinc-400">
          <Power className="h-4 w-4" />
          Trading Engine
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {tradingEnabled ? (
              <ShieldCheck className="h-8 w-8 text-green-500" />
            ) : (
              <ShieldOff className="h-8 w-8 text-red-500" />
            )}
            <div>
              <p className="font-semibold">
                {tradingEnabled ? "Active" : "Stopped"}
              </p>
              <p className="text-xs text-zinc-500">
                {tradingEnabled
                  ? "AI is analyzing and trading"
                  : "All trading halted"}
              </p>
            </div>
          </div>

          <Button
            variant={tradingEnabled ? "destructive" : "success"}
            size="lg"
            onClick={handleToggle}
            disabled={loading}
          >
            {loading
              ? "..."
              : tradingEnabled
                ? "KILL SWITCH"
                : "ENABLE TRADING"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
