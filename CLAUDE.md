# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```powershell
npm ci                    # install dependencies
npm start                 # dev server at localhost:4200
npm run build             # production build
npm run emulators         # start Firebase Auth + Firestore emulators (requires Java 11+)
npm run seed:emulator     # seed sample coins into running Firestore emulator
```

There is no lint or test command wired up — `ng test` and `ng lint` are not configured.

## Architecture

### Data flow

Coin data is fetched **directly from the CoinGecko public API** in the browser on every app load. `CoinRepository` (`src/app/core/services/coin.repository.ts`) calls `CoinGeckoService` (`src/app/core/services/coin-gecko.service.ts`), which fetches the top 40 coins from each of the 17 allowed categories sequentially (200ms between requests to respect the free-tier rate limit of ~30 req/min), deduplicates, computes invest scores client-side, and returns a single sorted `Observable<Coin[]>`.

**Firebase is only used for user data**, not coin data:
- `users/{uid}/preferences/settings` — risk tolerance, market cap filter, enabled categories, sort preference
- `users/{uid}/watchlist/{coinId}` — saved watchlist items

### Coin scoring

`clientInvestScore()` in `src/app/core/utils/coin-filters.ts` computes a 0–100 score from five normalised factors: market cap, liquidity (volume + vol/mc ratio), community sentiment, developer activity, and price stability (7d+30d volatility). Each factor is weighted by the user's risk profile (`conservative` / `balanced` / `aggressive`). This function is the sole scoring path — it runs on every list render via `filterAndSortCoins()`.

On the detail page, `CoinRepository.watchCoin(id)` fetches the `/coins/{id}` CoinGecko endpoint (which includes developer data and community sentiment) and recomputes the invest score against a fixed normalization context (`DETAIL_SCORE_CTX = { maxMc: 1T, maxVol: 50B }`), so detail-page scores may differ slightly from list-page scores.

### Signals pattern

The app is **zoneless** — there is no NgZone and no `zone.js`. All reactivity uses Angular signals. The standard pattern across every component is:

```ts
private readonly rawCoins = toSignal(this.repo.watchCoins(), { initialValue: [] });
readonly sortedCoins = computed(() => filterAndSortCoins(this.rawCoins(), this.prefs()));
```

Observables are only used at service boundaries (Firestore `onSnapshot`, CoinGecko HTTP calls). They are converted to signals with `toSignal()` at the component level. All components use `ChangeDetectionStrategy.OnPush`.

### Category filtering

The 17 allowed CoinGecko category slugs are the single source of truth in `src/app/core/config/allowed-categories.ts`. This file drives both what the API fetches and what the user can enable/disable in preferences. Adding a new category means adding it here only.

### Styling system

All components use SCSS with BEM naming. Shared design tokens live in `src/styles/_variables.scss` (colours, spacing, radii) and mixins in `src/styles/_mixins.scss` (`card-surface`, `focus-ring`, `truncate`). Every component SCSS file imports these via `@use '../../../../styles/variables' as *`.

### Firebase initialisation

`src/app/core/firebase/firebase-app.ts` initialises Firebase lazily using module-level singletons (not Angular DI). Services call `getFirebaseAuth()` / `getFirebaseFirestore()` directly. Emulator connections are wired here based on `environment.useEmulators`.

### Environment files

`src/environments/environment.ts` — dev (points to emulators, uses demo project ID).  
`src/environments/environment.prod.ts` — production (real Firebase config, `useEmulators: false`).  
Angular swaps these at build time via `fileReplacements` in `angular.json`.

### Known issues (from audit)

1. **Coin card summaries are blank** — `watchCoins()` sets `summary: ''` because the `/coins/markets` CoinGecko endpoint does not return descriptions. `buildSummary()` is only called in `watchCoin()` (detail page). Fix: call `buildSummary(undefined, categories)` in `watchCoins()` to produce the category-based fallback string.
2. **Score breakdown section on detail page renders empty** — `scoreBreakdown` is always `{}` because `clientInvestScore()` returns only a number. The detail page iterates `Object.entries(scoreBreakdown)` and renders nothing. Fix: either populate `scoreBreakdown` with the five component values, or remove the section from the template.
3. **Stale empty-state message** — `coin-list.component.html` still references Cloud Functions in its empty-state message. Cloud Functions were removed; coins now come from CoinGecko.
