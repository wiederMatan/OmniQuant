import type { NewsItem, MarketData } from "@/types";

const NEWS_API_BASE = "https://newsapi.org/v2";

export async function fetchMarketNews(
  symbols: string[]
): Promise<NewsItem[]> {
  const apiKey = process.env.NEWS_API_KEY;
  if (!apiKey) {
    console.warn("NEWS_API_KEY not set, returning empty news");
    return [];
  }

  const query = symbols.join(" OR ");
  const url = `${NEWS_API_BASE}/everything?q=${encodeURIComponent(query)}&language=en&sortBy=publishedAt&pageSize=20&apiKey=${apiKey}`;

  try {
    const response = await fetch(url, { next: { revalidate: 300 } });

    if (!response.ok) {
      console.error(`NewsAPI error: ${response.status}`);
      return [];
    }

    const data = await response.json();

    return (data.articles || []).map(
      (article: Record<string, unknown>) => ({
        title: article.title as string,
        description: (article.description as string) || "",
        source: (article.source as Record<string, string>)?.name || "Unknown",
        url: article.url as string,
        publishedAt: article.publishedAt as string,
      })
    );
  } catch (error) {
    console.error("Failed to fetch news:", error);
    return [];
  }
}

export function buildMarketContext(
  marketData: MarketData,
  news: NewsItem[]
): string {
  const priceSection = `
## Current Market Data for ${marketData.symbol}
- Price: $${marketData.price.toFixed(2)}
- Change: $${marketData.change.toFixed(2)} (${marketData.changePercent.toFixed(2)}%)
- Volume: ${marketData.volume.toLocaleString()}
- Day Range: $${marketData.low.toFixed(2)} - $${marketData.high.toFixed(2)}
- Open: $${marketData.open.toFixed(2)}
- Previous Close: $${marketData.previousClose.toFixed(2)}
`;

  const newsSection =
    news.length > 0
      ? `
## Recent News
${news
  .slice(0, 10)
  .map(
    (n, i) =>
      `${i + 1}. **${n.title}** (${n.source}, ${new Date(n.publishedAt).toLocaleDateString()})
   ${n.description}`
  )
  .join("\n")}
`
      : "\n## Recent News\nNo recent news available.\n";

  return priceSection + newsSection;
}
