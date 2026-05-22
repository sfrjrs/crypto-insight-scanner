/**
 * Crypto Insight Scanner — Agent Script
 *
 * Fetches coin market data from CoinGecko, computes invest scores, and writes
 * results to Firestore. Run this locally on a schedule to keep the app fed.
 *
 * Emulator:   npm run agent:emulator
 * Production: npm run agent          (requires GOOGLE_APPLICATION_CREDENTIALS or ADC)
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

// ─── Config ──────────────────────────────────────────────────────────────────

const USE_EMULATOR = !!process.env.FIRESTORE_EMULATOR_HOST;
const PROJECT_ID = USE_EMULATOR
  ? 'demo-crypto-insight-scanner'
  : (process.env.FIREBASE_PROJECT_ID ?? 'crypto-insight-scanner');

const COINGECKO_BASE = process.env.COINGECKO_API_KEY
  ? 'https://pro-api.coingecko.com/api/v3'
  : 'https://api.coingecko.com/api/v3';

const COINGECKO_HEADERS = process.env.COINGECKO_API_KEY
  ? { 'x-cg-pro-api-key': process.env.COINGECKO_API_KEY, Accept: 'application/json' }
  : { Accept: 'application/json' };

const PER_CATEGORY = 20;     // coins to fetch per category
const REQUEST_DELAY_MS = 2_500; // stay comfortably under 30 req/min free-tier limit
const WRITE_BATCH_SIZE = 400;

// ─── Categories ──────────────────────────────────────────────────────────────

const ALLOWED_CATEGORY_IDS = [
  'real-world-assets-rwa',
  'infrastructure',
  'depin',
  'decentralized-finance-defi',
  'payment',
  'enterprise-solutions',
  'business-services',
  'energy',
  'supply-chain',
  'healthcare',
  'insurance',
  'legal',
  'identity',
  'storage',
  'oracle',
  'layer-2',
  'smart-contract-platform',
];

const CATEGORY_LABELS = {
  'real-world-assets-rwa': 'Real World Assets',
  infrastructure: 'Infrastructure',
  depin: 'DePIN',
  'decentralized-finance-defi': 'DeFi',
  payment: 'Payments',
  'enterprise-solutions': 'Enterprise',
  'business-services': 'Business Services',
  energy: 'Energy',
  'supply-chain': 'Supply Chain',
  healthcare: 'Healthcare',
  insurance: 'Insurance',
  legal: 'Legal',
  identity: 'Identity',
  storage: 'Storage',
  oracle: 'Oracle',
  'layer-2': 'Layer 2',
  'smart-contract-platform': 'Smart Contract Platform',
};

// ─── CoinGecko helpers ───────────────────────────────────────────────────────

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function cgFetch(path, retries = 3) {
  const url = `${COINGECKO_BASE}${path}`;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url, { headers: COINGECKO_HEADERS });
      if (res.status === 429) {
        const wait = 5_000 * (attempt + 1);
        console.warn(`  429 rate limit — waiting ${wait / 1000}s before retry…`);
        await sleep(wait);
        continue;
      }
      if (!res.ok) throw new Error(`CoinGecko ${res.status} on ${path}`);
      return res.json();
    } catch (err) {
      if (attempt === retries - 1) throw err;
      await sleep(2_000 * (attempt + 1));
    }
  }
}

async function fetchMarketsByCategory(category) {
  const params = new URLSearchParams({
    vs_currency: 'usd',
    category,
    order: 'market_cap_desc',
    per_page: String(PER_CATEGORY),
    page: '1',
    sparkline: 'false',
  });
  return cgFetch(`/coins/markets?${params}`);
}

async function fetchCoinDetail(id) {
  const params = new URLSearchParams({
    localization: 'false',
    tickers: 'false',
    market_data: 'true',
    community_data: 'true',
    developer_data: 'true',
    sparkline: 'false',
  });
  return cgFetch(`/coins/${id}?${params}`);
}

// ─── Scoring ─────────────────────────────────────────────────────────────────

const RISK_WEIGHTS = {
  balanced: { marketCap: 0.2, liquidity: 0.25, sentiment: 0.2, developer: 0.15, stability: 0.2 },
};

function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

function normalizeLog(value, min, max) {
  if (value <= 0 || max <= min) return 0;
  const logVal = Math.log10(Math.max(value, 1));
  const logMin = Math.log10(Math.max(min, 1));
  const logMax = Math.log10(Math.max(max, 1));
  return clamp01((logVal - logMin) / (logMax - logMin));
}

function computeInvestScore(coin, ctx) {
  const w = RISK_WEIGHTS.balanced;
  const marketCapNorm = normalizeLog(coin.marketCap, 1_000_000, ctx.maxMc);
  const volumeNorm = normalizeLog(coin.volume24h, 10_000, ctx.maxVol);
  const volMc = coin.marketCap > 0 ? clamp01((coin.volume24h / coin.marketCap) * 5) : 0;
  const liquidityNorm = clamp01(volumeNorm * 0.6 + volMc * 0.4);
  const sentimentNorm = clamp01(coin.communitySentimentUpPct / 100);
  const developerNorm = clamp01(coin.developerScore / 100);
  const volatility = (Math.abs(coin.change7d) + Math.abs(coin.change30d)) / 2;
  const stabilityNorm = clamp01(1 - volatility / 100);

  return Math.min(
    100,
    Math.round(
      marketCapNorm * w.marketCap * 100 +
        liquidityNorm * w.liquidity * 100 +
        sentimentNorm * w.sentiment * 100 +
        developerNorm * w.developer * 100 +
        stabilityNorm * w.stability * 100,
    ),
  );
}

function developerScoreFromDetail(detail) {
  const dev = detail.developer_data;
  if (!dev) return 0;
  const contributors = dev.pull_request_contributors ?? 0;
  const commits = dev.commit_count_4_weeks ?? 0;
  const stars = dev.stars ?? 0;
  const raw = contributors * 2 + commits * 0.5 + Math.log10(stars + 1) * 10;
  return Math.min(100, Math.round(raw));
}

// ─── Summary & pros/cons ─────────────────────────────────────────────────────

function stripHtml(html) {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function buildSummary(description, categories) {
  const cleaned = description ? stripHtml(description) : '';
  if (cleaned.length > 0) {
    return cleaned.length > 280 ? `${cleaned.slice(0, 277)}...` : cleaned;
  }
  const primary = categories[0];
  const label = primary ? (CATEGORY_LABELS[primary] ?? primary) : 'utility';
  return `${label} token tracked for real-world utility and market fundamentals.`;
}

function buildProsCons(coin) {
  const pros = [];
  const cons = [];
  const primaryCategory = coin.categories[0];

  if (primaryCategory) {
    const label = CATEGORY_LABELS[primaryCategory] ?? primaryCategory;
    if (primaryCategory === 'real-world-assets-rwa') {
      pros.push('Tied to real-world assets (RWA) — tokenization of tangible value.');
    } else if (['infrastructure', 'depin', 'oracle', 'storage'].includes(primaryCategory)) {
      pros.push(`Operates in ${label}, supporting core blockchain or physical infrastructure.`);
    } else if (['payment', 'enterprise-solutions', 'business-services'].includes(primaryCategory)) {
      pros.push(`Focused on ${label} with practical enterprise or payments use cases.`);
    } else {
      pros.push(`Listed in ${label}, aligning with utility-oriented sector classification.`);
    }
  }

  if (coin.marketCap >= 1_000_000_000) {
    pros.push('Large market cap suggests established liquidity and visibility.');
  } else if (coin.marketCap >= 100_000_000) {
    pros.push('Mid-cap profile with meaningful market presence.');
  }
  if (coin.volume24h >= 50_000_000) pros.push('Strong 24h trading volume supports entry and exit flexibility.');
  const volRatio = coin.marketCap > 0 ? coin.volume24h / coin.marketCap : 0;
  if (volRatio >= 0.05) pros.push('Healthy volume-to-market-cap ratio indicates active trading.');
  if (coin.communitySentimentUpPct >= 65) pros.push('Community sentiment skews positive on CoinGecko votes.');
  if (coin.developerScore >= 60) pros.push('Developer activity score suggests ongoing protocol maintenance.');
  if (coin.investScore >= 70) pros.push('Composite utility score ranks highly among screened assets.');

  if (coin.change7d >= 15) {
    cons.push('Sharp 7-day gains may indicate overheated short-term momentum.');
  } else if (coin.change7d <= -15) {
    cons.push('Notable 7-day decline — verify catalysts before allocating capital.');
  }
  if (Math.abs(coin.change30d) >= 40) cons.push('High 30-day volatility increases drawdown risk.');
  if (coin.marketCap < 50_000_000) cons.push('Smaller market cap assets carry higher liquidity and manipulation risk.');
  if (coin.volume24h < 1_000_000) cons.push('Low 24h volume can widen spreads and slippage on exits.');
  if (coin.communitySentimentUpPct < 45) cons.push('Community sentiment is mixed or negative — social risk elevated.');
  if (coin.developerScore < 30) cons.push('Limited developer activity may signal slower protocol iteration.');

  if (pros.length === 0) pros.push('Passes utility category and tag screening for further due diligence.');
  if (cons.length === 0) cons.push('Crypto assets remain speculative — conduct independent research.');

  return { pros: pros.slice(0, 6), cons: cons.slice(0, 6) };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  // Firebase Admin init
  if (!getApps().length) {
    if (USE_EMULATOR) {
      initializeApp({ projectId: PROJECT_ID });
      console.log(`Using Firestore emulator at ${process.env.FIRESTORE_EMULATOR_HOST}`);
    } else {
      // Uses GOOGLE_APPLICATION_CREDENTIALS or Application Default Credentials
      initializeApp({ projectId: PROJECT_ID });
      console.log(`Using production Firestore (project: ${PROJECT_ID})`);
    }
  }
  const db = getFirestore();

  // Step 1: fetch all categories
  console.log(`\nFetching ${ALLOWED_CATEGORY_IDS.length} categories (${PER_CATEGORY} coins each)…`);
  const categoryMap = new Map(); // id → { coin, categories[] }

  for (let i = 0; i < ALLOWED_CATEGORY_IDS.length; i++) {
    const category = ALLOWED_CATEGORY_IDS[i];
    if (i > 0) await sleep(REQUEST_DELAY_MS);
    process.stdout.write(`  [${i + 1}/${ALLOWED_CATEGORY_IDS.length}] ${category}… `);

    try {
      const coins = await fetchMarketsByCategory(category);
      let added = 0;
      for (const m of coins ?? []) {
        const existing = categoryMap.get(m.id);
        if (!existing || m.market_cap > existing.coin.market_cap) {
          categoryMap.set(m.id, { coin: m, categories: existing?.categories ?? [] });
        }
        const entry = categoryMap.get(m.id);
        if (!entry.categories.includes(category)) entry.categories.push(category);
        added++;
      }
      console.log(`${added} coins`);
    } catch (err) {
      console.log(`FAILED (${err.message})`);
    }
  }

  console.log(`\n${categoryMap.size} unique coins after deduplication.`);

  // Step 2: fetch detailed data per coin
  console.log(`\nFetching detailed data for ${categoryMap.size} coins…`);
  const enriched = [];
  const entries = [...categoryMap.entries()];

  for (let i = 0; i < entries.length; i++) {
    const [id, { coin: market, categories }] = entries[i];
    if (i > 0) await sleep(REQUEST_DELAY_MS);
    process.stdout.write(`  [${i + 1}/${entries.length}] ${market.name}… `);

    let developerScore = 0;
    let communitySentimentUpPct = 50;
    let description = '';
    let change7d = 0;
    let change30d = 0;

    try {
      const detail = await fetchCoinDetail(id);
      developerScore = developerScoreFromDetail(detail);
      communitySentimentUpPct = detail.community_data?.sentiment_votes_up_percentage ?? 50;
      description = detail.description?.en ?? '';
      change7d = detail.market_data?.price_change_percentage_7d ?? 0;
      change30d = detail.market_data?.price_change_percentage_30d ?? 0;
      console.log(`devScore=${developerScore} sentiment=${communitySentimentUpPct.toFixed(0)}%`);
    } catch (err) {
      console.log(`detail fetch failed (${err.message}) — using defaults`);
    }

    enriched.push({
      id,
      symbol: market.symbol,
      name: market.name,
      image: market.image,
      categories,
      tags: [],
      marketCap: market.market_cap ?? 0,
      volume24h: market.total_volume ?? 0,
      price: market.current_price ?? 0,
      change24h: market.price_change_percentage_24h ?? 0,
      change7d,
      change30d,
      communitySentimentUpPct,
      developerScore,
      investScore: 0,
      scoreBreakdown: {},
      summary: buildSummary(description, categories),
      pros: [],
      cons: [],
      lastSyncedAt: Timestamp.now(),
      coingeckoUrl: `https://www.coingecko.com/en/coins/${id}`,
    });
  }

  // Step 3: compute invest scores
  const maxMc = Math.max(...enriched.map((c) => c.marketCap), 1);
  const maxVol = Math.max(...enriched.map((c) => c.volume24h), 1);

  for (const coin of enriched) {
    coin.investScore = computeInvestScore(coin, { maxMc, maxVol });
    const { pros, cons } = buildProsCons(coin);
    coin.pros = pros;
    coin.cons = cons;
  }

  enriched.sort((a, b) => b.investScore - a.investScore);
  console.log(`\nScoring complete. Top coin: ${enriched[0]?.name} (${enriched[0]?.investScore})`);

  // Step 4: write to Firestore in batches
  console.log(`\nWriting ${enriched.length} coins to Firestore…`);
  for (let i = 0; i < enriched.length; i += WRITE_BATCH_SIZE) {
    const batch = db.batch();
    const chunk = enriched.slice(i, i + WRITE_BATCH_SIZE);
    for (const coin of chunk) {
      batch.set(db.collection('coins').doc(coin.id), coin);
    }
    await batch.commit();
    console.log(`  Wrote ${i + chunk.length}/${enriched.length}`);
  }

  console.log('\nDone.');
}

main().catch((err) => {
  console.error('\nAgent failed:', err);
  process.exit(1);
});
