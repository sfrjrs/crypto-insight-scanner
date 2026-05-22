import { describe, it } from 'node:test';
import assert from 'node:assert';
import { computeInvestScore } from './investScore';

describe('computeInvestScore', () => {
  it('returns score between 0 and 100', () => {
    const result = computeInvestScore(
      {
        marketCap: 1_000_000_000,
        volume24h: 50_000_000,
        change7d: 5,
        change30d: 10,
        communitySentimentUpPct: 70,
        developerScore: 60,
      },
      { maxMarketCap: 2_000_000_000, maxVolume: 100_000_000 },
      'balanced',
    );
    assert.ok(result.investScore >= 0 && result.investScore <= 100);
    assert.ok(Object.keys(result.scoreBreakdown).length === 5);
  });
});
