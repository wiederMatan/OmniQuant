import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OmniQuant | Autonomous Trading Engine",
  description: "AI-powered autonomous trading engine with paper trading support",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-zinc-950 text-zinc-50 antialiased">
        <nav className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-14 items-center justify-between">
              <div className="flex items-center gap-6">
                <a href="/" className="text-lg font-bold tracking-tight">
                  <span className="text-emerald-400">Omni</span>Quant
                </a>
                <div className="hidden md:flex items-center gap-4">
                  <a
                    href="/"
                    className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors"
                  >
                    Dashboard
                  </a>
                  <a
                    href="/audit"
                    className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors"
                  >
                    Audit Trail
                  </a>
                  <a
                    href="/settings"
                    className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors"
                  >
                    Settings
                  </a>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs text-zinc-500">Paper Mode</span>
              </div>
            </div>
          </div>
        </nav>
        <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>
      </body>
    </html>
  );
}
