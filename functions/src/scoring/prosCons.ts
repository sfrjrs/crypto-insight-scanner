import { CATEGORY_LABELS } from '../config/categories';

export interface ProsConsInput {
  categories: string[];
  marketCap: number;
  volume24h: number;
  change7d: number;
  change30d: number;
  communitySentimentUpPct: number;
  developerScore: number;
  investScore: number;
}

export function buildProsCons(input: ProsConsInput): { pros: string[]; cons: string[] } {
  const pros: string[] = [];
  const cons: string[] = [];

  const primaryCategory = input.categories[0];
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

  if (input.marketCap >= 1_000_000_000) {
    pros.push('Large market cap suggests established liquidity and visibility.');
  } else if (input.marketCap >= 100_000_000) {
    pros.push('Mid-cap profile with meaningful market presence.');
  }

  if (input.volume24h >= 50_000_000) {
    pros.push('Strong 24h trading volume supports entry and exit flexibility.');
  }

  const volRatio = input.marketCap > 0 ? input.volume24h / input.marketCap : 0;
  if (volRatio >= 0.05) {
    pros.push('Healthy volume-to-market-cap ratio indicates active trading.');
  }

  if (input.communitySentimentUpPct >= 65) {
    pros.push('Community sentiment skews positive on CoinGecko votes.');
  }

  if (input.developerScore >= 60) {
    pros.push('Developer activity score suggests ongoing protocol maintenance.');
  }

  if (input.investScore >= 70) {
    pros.push('Composite utility score ranks highly among screened assets.');
  }

  if (input.change7d >= 15) {
    cons.push('Sharp 7-day gains may indicate overheated short-term momentum.');
  } else if (input.change7d <= -15) {
    cons.push('Notable 7-day decline — verify catalysts before allocating capital.');
  }

  if (Math.abs(input.change30d) >= 40) {
    cons.push('High 30-day volatility increases drawdown risk.');
  }

  if (input.marketCap < 50_000_000) {
    cons.push('Smaller market cap assets carry higher liquidity and manipulation risk.');
  }

  if (input.volume24h < 1_000_000) {
    cons.push('Low 24h volume can widen spreads and slippage on exits.');
  }

  if (input.communitySentimentUpPct < 45) {
    cons.push('Community sentiment is mixed or negative — social risk elevated.');
  }

  if (input.developerScore < 30) {
    cons.push('Limited developer activity may signal slower protocol iteration.');
  }

  if (pros.length === 0) {
    pros.push('Passes utility category and tag screening for further due diligence.');
  }
  if (cons.length === 0) {
    cons.push('Crypto assets remain speculative — conduct independent research.');
  }

  return { pros: pros.slice(0, 6), cons: cons.slice(0, 6) };
}
