# Market Insight — Indonesian Stock Market Dashboard

Next.js (App Router) + TypeScript + Tailwind CSS + shadcn/ui-style components + Recharts, built from the supplied Google Stitch design. Shows IHSG, LQ45, IDX30 and IDX80 with summary cards, an interactive IHSG chart (1D / 1W / 1M / 3M / 6M / 1Y) and a comparison table. Deploys to Vercel with no extra infrastructure.

## Quick start

```bash
npm install
cp .env.example .env.local   # optional, defaults to mock data
npm run dev                  # http://localhost:3000
```

Other scripts: `npm run typecheck`, `npm run lint`, `npm run build`, `npm start`.
Requires Node.js 20+.

## Data source and API configuration

The app ships with two providers, selected with `MARKET_DATA_PROVIDER`:

| Value | Source | Freshness | Key | Coverage |
|---|---|---|---|---|
| `mock` (default) | Synthetic data seeded from the design | Not real | none | all 4 indices |
| `yahoo` | Yahoo Finance chart endpoint (unofficial) | Delayed (nominally ~10 min), end-of-day when the market is closed | none | IHSG `^JKSE` and LQ45 `^JKLQ45`; IDX30/IDX80 only if you set a symbol |

**Verification status (please read).** `^JKSE` and `^JKLQ45` are widely cited Yahoo symbols for these indices. I could not confirm a Yahoo symbol for IDX30 or IDX80, so they are not configured by default and the UI shows them as "unavailable" rather than guessing. Google Finance and Investing.com list all four indices, but neither offers an official API. The Yahoo endpoint is unofficial: it can throttle or block datacenter IPs (including Vercel's), has no SLA, and its terms do not cover commercial use. Treat it as a prototype source. The Yahoo provider was not exercised against the live service during development (the build sandbox could not reach it); the mock provider and all error paths were tested.

For production, use a licensed provider that covers all four indices. To add one:

1. Create `src/services/market-data/providers/<vendor>.ts` implementing `MarketDataProvider` (`provider.ts`).
2. Put response-to-model mapping in `normalizers/<vendor>.ts`.
3. Register it in `getProvider()` in `services/market-data/index.ts` and in `lib/env.ts`.
4. Read the key with `getMarketDataApiKey()` (`MARKET_DATA_API_KEY`). It is only read server-side; never use a `NEXT_PUBLIC_` prefix.

Set `dataMode` to `realtime`, `delayed` or `end-of-day` accurately; the UI badge and banner follow it.

### Data labelling
- **MOCK DATA FEED**: synthetic values.
- **DELAYED ~N MIN**: delayed feed while the market is open.
- **END-OF-DAY**: shown automatically for delayed feeds when the market is closed.
- **REAL-TIME**: only for a provider that declares `realtime`.

### Caching and errors
- In-memory TTL cache with request de-duplication (`lib/cache.ts`): quotes 30 s while trading / 5 min closed; 1D history 60 s; longer ranges 15 min.
- API responses send `s-maxage` so Vercel's CDN caches them across instances.
- The client polls every 30 s (chart every 60 s on 1D) while the tab is visible, and keeps the last good data if a refresh fails.
- If some indices fail, the rest still render and the failed ones show "unavailable". If all fail, the UI shows an error panel with retry.

## API routes

- `GET /api/market/indices` → `MarketSnapshot` (quotes, market status, data meta)
- `GET /api/market/history?code=IHSG&range=1D` → `IndexHistory` (`range`: 1D, 1W, 1M, 3M, 6M, 1Y)

Errors use `{ "error": { "code", "message" } }` with 400 / 404 / 502 / 504.

## Project structure

```
src/
  app/                      layout, page, API route handlers
  components/ui/            shadcn-style primitives (Button, Input, Skeleton, Icon)
  components/dashboard/     dashboard UI (cards, chart, table, banners, states)
  hooks/                    polling + clock hooks
  lib/                      format, cache, env, api helpers
  services/market-data/     provider interface, providers/, normalizers/, market hours
  types/market.ts           shared TypeScript interfaces
```

To show more indices (the design also lists KOMPAS100, ISSI, INFOBANK15), add them to `services/market-data/indices.ts`, the `IndexCode` type, the mock `BASE` table, and each provider's symbol map. Cards and the table are driven by that registry.

## Market status

Computed on the server from WIB time: Mon–Thu 09:00–12:00 and 13:30–16:00, Fri 09:00–11:30 and 14:00–16:00. **Public holidays are not modelled**, so the badge may read OPEN on a holiday while data stays flat. Add a holiday list in `market-hours.ts` if needed.

## Deploy to Vercel

1. Push the repo to GitHub/GitLab/Bitbucket.
2. In Vercel: **Add New → Project**, import the repo. Framework preset: Next.js (auto-detected); defaults for build/output are correct.
3. Under **Settings → Environment Variables** add `MARKET_DATA_PROVIDER` (and any symbol or key variables) for Production and Preview.
4. Deploy. Or via CLI: `npm i -g vercel && vercel --prod`.

## Notes

- Fonts (Hanken Grotesk, JetBrains Mono) and Material Symbols load from Google Fonts, as in the Stitch export.
- shadcn/ui: `components.json` is included so `npx shadcn@latest add <component>` works. The few primitives used were written by hand in shadcn's style.
- Sidebar items other than Market Overview, and the profile button, are visual placeholders from the design.
- Informational only; not investment advice.
