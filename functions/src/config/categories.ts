/** CoinGecko category IDs for utility / real-world use cases */
export const ALLOWED_CATEGORIES = [
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
] as const;

export type AllowedCategory = (typeof ALLOWED_CATEGORIES)[number];

export const EXCLUDED_TAGS = new Set([
  'meme',
  'memes',
  'animal-meme',
  'frog-themed',
  'cat-themed',
  'dog-themed',
  'duck-themed',
  'elon-inspired',
  'celebrity-themed',
  'gambling',
  'adult',
  'nsfw',
  'joke',
  'parody',
]);

export const CATEGORY_LABELS: Record<string, string> = {
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
