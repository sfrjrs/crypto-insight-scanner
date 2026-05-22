const DEMO_BASE = 'https://api.coingecko.com/api/v3';
const PRO_BASE = 'https://pro-api.coingecko.com/api/v3';

export interface MarketCoin {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  total_volume: number;
  price_change_percentage_24h_in_currency?: number;
  price_change_percentage_7d_in_currency?: number;
  price_change_percentage_30d_in_currency?: number;
  categories?: string[];
}

export interface CoinDetail {
  id: string;
  symbol: string;
  name: string;
  description?: { en?: string };
  categories?: string[];
  links?: { homepage?: string[] };
  community_data?: {
    sentiment_votes_up_percentage?: number;
  };
  developer_data?: {
    pull_request_contributors?: number;
    commit_count_4_weeks?: number;
    stars?: number;
  };
  market_data?: {
    current_price?: { usd?: number };
    market_cap?: { usd?: number };
    total_volume?: { usd?: number };
    price_change_percentage_24h?: number;
    price_change_percentage_7d?: number;
    price_change_percentage_30d?: number;
  };
}

function getBaseUrl(): string {
  return process.env.COINGECKO_API_KEY ? PRO_BASE : DEMO_BASE;
}

function getHeaders(): Record<string, string> {
  const key = process.env.COINGECKO_API_KEY;
  if (key) {
    return { 'x-cg-pro-api-key': key, Accept: 'application/json' };
  }
  return { Accept: 'application/json' };
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchJson<T>(path: string, retries = 3): Promise<T> {
  const url = `${getBaseUrl()}${path}`;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url, { headers: getHeaders() });
      if (res.status === 429) {
        await sleep(2000 * (attempt + 1));
        continue;
      }
      if (!res.ok) {
        throw new Error(`CoinGecko ${res.status}: ${await res.text()}`);
      }
      return (await res.json()) as T;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      await sleep(1000 * (attempt + 1));
    }
  }

  throw lastError ?? new Error('CoinGecko request failed');
}

export async function fetchMarketsByCategory(
  category: string,
  perPage = 50,
): Promise<MarketCoin[]> {
  const params = new URLSearchParams({
    vs_currency: 'usd',
    category,
    order: 'market_cap_desc',
    per_page: String(perPage),
    page: '1',
    sparkline: 'false',
  });
  return fetchJson<MarketCoin[]>(`/coins/markets?${params}`);
}

export async function fetchCoinDetail(id: string): Promise<CoinDetail> {
  const params = new URLSearchParams({
    localization: 'false',
    tickers: 'false',
    market_data: 'true',
    community_data: 'true',
    developer_data: 'true',
  });
  return fetchJson<CoinDetail>(`/coins/${id}?${params}`);
}

export function developerScoreFromDetail(detail: CoinDetail): number {
  const dev = detail.developer_data;
  if (!dev) return 0;
  const contributors = dev.pull_request_contributors ?? 0;
  const commits = dev.commit_count_4_weeks ?? 0;
  const stars = dev.stars ?? 0;
  const raw = contributors * 2 + commits * 0.5 + Math.log10(stars + 1) * 10;
  return Math.min(100, Math.round(raw));
}
