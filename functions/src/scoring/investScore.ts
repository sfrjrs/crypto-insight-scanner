export type RiskTolerance = 'conservative' | 'balanced' | 'aggressive';

export interface CoinMetrics {
  marketCap: number;
  volume24h: number;
  change7d: number;
  change30d: number;
  communitySentimentUpPct: number;
  developerScore: number;
}

export interface ScoreWeights {
  marketCap: number;
  liquidity: number;
  sentiment: number;
  developer: number;
  stability: number;
}

const WEIGHT_PROFILES: Record<RiskTolerance, ScoreWeights> = {
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

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function normalizeLog(value: number, min: number, max: number): number {
  if (value <= 0 || max <= min) return 0;
  const logVal = Math.log10(Math.max(value, 1));
  const logMin = Math.log10(Math.max(min, 1));
  const logMax = Math.log10(Math.max(max, 1));
  return clamp01((logVal - logMin) / (logMax - logMin));
}

export function computeInvestScore(
  metrics: CoinMetrics,
  context: { maxMarketCap: number; maxVolume: number },
  risk: RiskTolerance = 'balanced',
): { investScore: number; scoreBreakdown: Record<string, number> } {
  const weights = WEIGHT_PROFILES[risk];

  const marketCapNorm = normalizeLog(metrics.marketCap, 1_000_000, context.maxMarketCap);
  const volumeNorm = normalizeLog(metrics.volume24h, 10_000, context.maxVolume);
  const volMcRatio =
    metrics.marketCap > 0 ? clamp01((metrics.volume24h / metrics.marketCap) * 5) : 0;
  const liquidityNorm = clamp01(volumeNorm * 0.6 + volMcRatio * 0.4);

  const sentimentNorm = clamp01(metrics.communitySentimentUpPct / 100);
  const developerNorm = clamp01(metrics.developerScore / 100);

  const volatility = (Math.abs(metrics.change7d) + Math.abs(metrics.change30d)) / 2;
  const stabilityNorm = clamp01(1 - volatility / 100);

  const scoreBreakdown = {
    marketCap: Math.round(marketCapNorm * weights.marketCap * 100),
    liquidity: Math.round(liquidityNorm * weights.liquidity * 100),
    sentiment: Math.round(sentimentNorm * weights.sentiment * 100),
    developer: Math.round(developerNorm * weights.developer * 100),
    stability: Math.round(stabilityNorm * weights.stability * 100),
  };

  const investScore = Object.values(scoreBreakdown).reduce((sum, v) => sum + v, 0);

  return { investScore: Math.min(100, investScore), scoreBreakdown };
}
