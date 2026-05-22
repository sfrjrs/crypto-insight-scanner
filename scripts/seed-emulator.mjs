/**
 * Seed Firestore emulator with sample coins for local UI development.
 * Requires emulators already running: npm run emulators (then npm run emulators:seed)
 */
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8081';

if (!getApps().length) {
  initializeApp({ projectId: 'demo-crypto-insight-scanner' });
}

const db = getFirestore();
const now = Timestamp.now();

const sampleCoins = [
  {
    id: 'ondo-finance',
    symbol: 'ondo',
    name: 'Ondo',
    image: 'https://assets.coingecko.com/coins/images/26580/small/ONDO.png',
    categories: ['real-world-assets-rwa'],
    tags: [],
    marketCap: 2_500_000_000,
    volume24h: 180_000_000,
    price: 1.12,
    change24h: 1.2,
    change7d: 4.5,
    change30d: 12.3,
    communitySentimentUpPct: 72,
    developerScore: 55,
    investScore: 78,
    scoreBreakdown: { marketCap: 18, liquidity: 22, sentiment: 16, developer: 11, stability: 11 },
    summary:
      'Ondo bridges traditional finance and DeFi by tokenizing real-world assets such as US Treasuries for on-chain investors.',
    pros: [
      'Tied to real-world assets (RWA) — tokenization of tangible value.',
      'Large market cap suggests established liquidity and visibility.',
      'Strong 24h trading volume supports entry and exit flexibility.',
    ],
    cons: ['Crypto assets remain speculative — conduct independent research.'],
    lastSyncedAt: now,
    coingeckoUrl: 'https://www.coingecko.com/en/coins/ondo-finance',
  },
  {
    id: 'chainlink',
    symbol: 'link',
    name: 'Chainlink',
    image: 'https://assets.coingecko.com/coins/images/877/small/Chainlink_Logo.png',
    categories: ['oracle', 'infrastructure'],
    tags: [],
    marketCap: 9_000_000_000,
    volume24h: 420_000_000,
    price: 14.2,
    change24h: -0.8,
    change7d: 2.1,
    change30d: -5.4,
    communitySentimentUpPct: 68,
    developerScore: 82,
    investScore: 81,
    scoreBreakdown: { marketCap: 20, liquidity: 24, sentiment: 15, developer: 14, stability: 8 },
    summary:
      'Chainlink provides decentralized oracle infrastructure connecting smart contracts to real-world data and systems.',
    pros: [
      'Operates in Oracle, supporting core blockchain or physical infrastructure.',
      'Large market cap suggests established liquidity and visibility.',
      'Developer activity score suggests ongoing protocol maintenance.',
    ],
    cons: ['Notable 7-day decline — verify catalysts before allocating capital.'],
    lastSyncedAt: now,
    coingeckoUrl: 'https://www.coingecko.com/en/coins/chainlink',
  },
  {
    id: 'helium',
    symbol: 'hnt',
    name: 'Helium',
    image: 'https://assets.coingecko.com/coins/images/4284/small/Helium_HNT.png',
    categories: ['depin', 'infrastructure'],
    tags: [],
    marketCap: 450_000_000,
    volume24h: 22_000_000,
    price: 2.85,
    change24h: 3.1,
    change7d: -8.2,
    change30d: 18.5,
    communitySentimentUpPct: 61,
    developerScore: 48,
    investScore: 62,
    scoreBreakdown: { marketCap: 12, liquidity: 14, sentiment: 13, developer: 10, stability: 13 },
    summary:
      'Helium is a decentralized wireless network enabling IoT devices to communicate through community-operated hotspots.',
    pros: [
      'Operates in DePIN, supporting core blockchain or physical infrastructure.',
      'Mid-cap profile with meaningful market presence.',
    ],
    cons: ['High 30-day volatility increases drawdown risk.'],
    lastSyncedAt: now,
    coingeckoUrl: 'https://www.coingecko.com/en/coins/helium',
  },
];

const batch = db.batch();
for (const coin of sampleCoins) {
  batch.set(db.collection('coins').doc(coin.id), coin);
}
await batch.commit();
console.log(`Seeded ${sampleCoins.length} coins into emulator.`);
