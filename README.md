# Crypto Utility Scanner

Angular 21 (zoneless, signals) + Firebase app that ranks crypto assets with real-world utility based on market data, community sentiment, and rule-based scoring.

## Stack

- **Angular 21** — standalone components, signals, SCSS/BEM
- **Firebase** — Auth, Firestore, Hosting (Spark free plan)
- **CoinGecko API** — market data fetched directly from the browser on app load

## Prerequisites

- Node.js 20.19+
- **Java JDK 11+** (required for the Firestore emulator). Install via [Microsoft OpenJDK 21](https://learn.microsoft.com/en-us/java/openjdk/download) or:
  ```powershell
  winget install Microsoft.OpenJDK.21
  ```
  After installing, **close and reopen your terminal** so `java` is on your PATH — or use `npm run emulators`, which sets `JAVA_HOME` automatically.
- Firebase CLI: `npm install -g firebase-tools` or use `npx firebase-tools@latest`

## Quick start (local emulators)

Local development uses the fake Firebase project `demo-crypto-insight-scanner` (see `.firebaserc`) so Auth and Firestore emulators work without a real GCP project. Coin data is fetched live from the CoinGecko public API.

Firestore runs on port **8081** (8080 is commonly used by other tools). If ports are stuck, `npm run emulators` stops stale Java emulator processes automatically, or run:

```powershell
netstat -ano | findstr ":8081"
Stop-Process -Id <PID> -Force
```

```bash
npm ci
npm run emulators
```

(`npm run emulators` runs `scripts/start-emulators.ps1`, which sets `JAVA_HOME` if your terminal was opened before Java was installed. You can still use `firebase emulators:start` directly after reopening the terminal.)

In another terminal (while emulators keep running in the first):

```bash
npm start
```

Open http://localhost:4200 — coin data loads from the CoinGecko API (allow ~5–8 seconds on first load for all 17 categories to fetch).

> **Note:** `npm run seed:emulator` can populate the Firestore emulator with sample user data (preferences/watchlist) for testing authenticated features, but coin data no longer comes from Firestore.

## Firebase project setup

1. Create a Firebase project and update `.firebaserc` + `src/environments/environment.prod.ts` with your project's config values from the Firebase console (Project Settings → Your apps → Web app).
2. Enable **Google** and **Email/Password** auth in the Firebase console.
3. Deploy Firestore rules:
   ```bash
   firebase deploy --only firestore
   ```
4. Build and deploy hosting:
   ```bash
   npm run build
   firebase deploy --only hosting
   ```

## How coin data works

On every app load, the Angular app calls the [CoinGecko public API](https://www.coingecko.com/en/api) directly from the browser:

1. Fetches the top 40 coins from each of 17 utility categories (sequential requests, 200ms apart)
2. Deduplicates coins that appear across multiple categories
3. Computes invest scores client-side using market cap, liquidity, sentiment, and price stability
4. On the coin detail page, fetches full coin data including developer activity and community sentiment

No API key is required. The free CoinGecko tier allows ~30 requests/minute.

## Disclaimer

This app is for research and education only — not financial advice.
