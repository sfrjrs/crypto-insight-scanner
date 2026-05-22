import * as admin from 'firebase-admin';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { ALLOWED_CATEGORIES, EXCLUDED_TAGS } from './config/categories';
import {
  fetchCoinDetail,
  fetchMarketsByCategory,
  developerScoreFromDetail,
  MarketCoin,
} from './services/coingecko';
import { computeInvestScore } from './scoring/investScore';
import { buildSummary } from './scoring/summary';
import { buildProsCons } from './scoring/prosCons';

admin.initializeApp();
const db = admin.firestore();

export interface StoredCoin {
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
  lastSyncedAt: admin.firestore.Timestamp;
  coingeckoUrl: string;
}

function hasExcludedTag(categories: string[], tags: string[]): boolean {
  const combined = [...categories, ...tags].map((t) => t.toLowerCase());
  return combined.some((t) => EXCLUDED_TAGS.has(t) || t.includes('meme'));
}

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function buildStoredCoin(
  market: MarketCoin,
  category: string,
  maxMarketCap: number,
  maxVolume: number,
): Promise<StoredCoin | null> {
  await sleep(1200);
  const detail = await fetchCoinDetail(market.id);
  const categories = [
    ...new Set([...(detail.categories ?? []), category, ...(market.categories ?? [])]),
  ];
  const tags = categories.filter((c) => EXCLUDED_TAGS.has(c.toLowerCase()));
  if (hasExcludedTag(categories, tags)) {
    return null;
  }

  const md = detail.market_data;
  const marketCap = md?.market_cap?.usd ?? market.market_cap ?? 0;
  const volume24h = md?.total_volume?.usd ?? market.total_volume ?? 0;
  const price = md?.current_price?.usd ?? market.current_price ?? 0;
  const change24h = md?.price_change_percentage_24h ?? market.price_change_percentage_24h_in_currency ?? 0;
  const change7d = md?.price_change_percentage_7d ?? market.price_change_percentage_7d_in_currency ?? 0;
  const change30d = md?.price_change_percentage_30d ?? market.price_change_percentage_30d_in_currency ?? 0;
  const communitySentimentUpPct =
    detail.community_data?.sentiment_votes_up_percentage ?? 50;
  const developerScore = developerScoreFromDetail(detail);

  const metrics = {
    marketCap,
    volume24h,
    change7d,
    change30d,
    communitySentimentUpPct,
    developerScore,
  };

  const { investScore, scoreBreakdown } = computeInvestScore(metrics, {
    maxMarketCap,
    maxVolume,
  });

  const summary = buildSummary(detail.description?.en, categories);
  const { pros, cons } = buildProsCons({
    categories,
    marketCap,
    volume24h,
    change7d,
    change30d,
    communitySentimentUpPct,
    developerScore,
    investScore,
  });

  return {
    id: market.id,
    symbol: market.symbol,
    name: market.name,
    image: market.image,
    categories,
    tags: [],
    marketCap,
    volume24h,
    price,
    change24h,
    change7d,
    change30d,
    communitySentimentUpPct,
    developerScore,
    investScore,
    scoreBreakdown,
    summary,
    pros,
    cons,
    lastSyncedAt: admin.firestore.Timestamp.now(),
    coingeckoUrl: `https://www.coingecko.com/en/coins/${market.id}`,
  };
}

export async function syncMarketData(): Promise<{ written: number; skipped: number }> {
  const marketMap = new Map<string, MarketCoin & { sourceCategory: string }>();

  for (const category of ALLOWED_CATEGORIES) {
    try {
      const markets = await fetchMarketsByCategory(category, 40);
      for (const m of markets) {
        if (!marketMap.has(m.id)) {
          marketMap.set(m.id, { ...m, sourceCategory: category });
        }
      }
      await sleep(1500);
    } catch (err) {
      console.error(`Category fetch failed: ${category}`, err);
    }
  }

  const markets = [...marketMap.values()];
  const maxMarketCap = Math.max(...markets.map((m) => m.market_cap ?? 0), 1);
  const maxVolume = Math.max(...markets.map((m) => m.total_volume ?? 0), 1);

  let written = 0;
  let skipped = 0;
  let batch = db.batch();
  let batchCount = 0;

  const commitBatch = async () => {
    if (batchCount > 0) {
      await batch.commit();
      batch = db.batch();
      batchCount = 0;
    }
  };

  for (const market of markets.slice(0, 120)) {
    try {
      const stored = await buildStoredCoin(
        market,
        market.sourceCategory,
        maxMarketCap,
        maxVolume,
      );
      if (!stored) {
        skipped++;
        continue;
      }
      const ref = db.collection('coins').doc(stored.id);
      batch.set(ref, stored, { merge: true });
      written++;
      batchCount++;
      if (batchCount >= 400) {
        await commitBatch();
      }
    } catch (err) {
      console.error(`Detail failed: ${market.id}`, err);
      skipped++;
    }
  }

  await commitBatch();

  return { written, skipped };
}

export const scheduledSyncMarketData = onSchedule(
  {
    schedule: 'every 30 minutes',
    timeZone: 'UTC',
    retryCount: 2,
  },
  async () => {
    const result = await syncMarketData();
    console.log('Sync complete', result);
  },
);

export const refreshCoins = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in required to trigger sync.');
  }
  const result = await syncMarketData();
  return result;
});
