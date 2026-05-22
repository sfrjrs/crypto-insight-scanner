import { Coin, UserPreferences, RiskTolerance } from '../models/coin.model';

const RISK_WEIGHTS: Record<
  RiskTolerance,
  { marketCap: number; liquidity: number; sentiment: number; developer: number; stability: number }
> = {
  conservative: {
    marketCap: 0.3,
    liquidity: 0.15,
    sentiment: 0.15,
    developer: 0.15,
    stability: 0.25,
  },
  balanced: {
    marketCap: 0.2,
    liquidity: 0.25,
    sentiment: 0.2,
    developer: 0.15,
    stability: 0.2,
  },
  aggressive: {
    marketCap: 0.1,
    liquidity: 0.35,
    sentiment: 0.25,
    developer: 0.1,
    stability: 0.2,
  },
};

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function normalizeLog(value: number, min: number, max: number): number {
  if (value <= 0 || max <= min) return 0;
  const logVal = Math.log10(Math.max(value, 1));
  const logMin = Math.log10(Math.max(min, 1));
  const logMax = Math.log10(Math.max(max, 1));
  return clamp01((logVal - logMin) / (logMax - logMin));
}

export function clientInvestScore(coin: Coin, risk: RiskTolerance, ctx: { maxMc: number; maxVol: number }): number {
  const w = RISK_WEIGHTS[risk];
  const b = coin.scoreBreakdown;
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

export function filterAndSortCoins(
  coins: Coin[],
  prefs: UserPreferences,
): Coin[] {
  const enabled =
    prefs.enabledCategories.length > 0
      ? new Set(prefs.enabledCategories)
      : null;

  const filtered = coins.filter((c) => {
    if (c.marketCap < prefs.minMarketCapUsd) return false;
    if (!enabled) return true;
    return c.categories.some((cat) => enabled.has(cat));
  });

  const maxMc = Math.max(...filtered.map((c) => c.marketCap), 1);
  const maxVol = Math.max(...filtered.map((c) => c.volume24h), 1);

  const withScore = filtered.map((c) => ({
    coin: c,
    score:
      prefs.riskTolerance === 'balanced'
        ? c.investScore
        : clientInvestScore(c, prefs.riskTolerance, { maxMc, maxVol }),
  }));

  const sortKey = prefs.sortBy;
  withScore.sort((a, b) => {
    if (sortKey === 'investScore') return b.score - a.score;
    if (sortKey === 'marketCap') return b.coin.marketCap - a.coin.marketCap;
    return b.coin.volume24h - a.coin.volume24h;
  });

  return withScore.map((x) => ({ ...x.coin, investScore: x.score }));
}
