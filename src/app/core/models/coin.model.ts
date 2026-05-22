export type RiskTolerance = 'conservative' | 'balanced' | 'aggressive';
export type SortBy = 'investScore' | 'marketCap' | 'volume24h';

export interface Coin {
  id: string;
  symbol: string;
  name: string;
  image: string;
  categories: string[];
  tags: string[];
  marketCap: number;
  volume24h: number;
  price: number;
  change24h: number;
  change7d: number;
  change30d: number;
  communitySentimentUpPct: number;
  developerScore: number;
  investScore: number;
  scoreBreakdown: Record<string, number>;
  summary: string;
  pros: string[];
  cons: string[];
  lastSyncedAt: { seconds: number; nanoseconds: number };
  coingeckoUrl: string;
}

export interface UserPreferences {
  riskTolerance: RiskTolerance;
  minMarketCapUsd: number;
  enabledCategories: string[];
  sortBy: SortBy;
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  riskTolerance: 'balanced',
  minMarketCapUsd: 10_000_000,
  enabledCategories: [],
  sortBy: 'investScore',
};

export interface WatchlistItem {
  coinId: string;
  addedAt: { seconds: number; nanoseconds: number };
}
