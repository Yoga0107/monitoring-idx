# Market Insight — Indonesian Stock Market Dashboard

Next.js (App Router) + TypeScript + Tailwind CSS + shadcn/ui-style components + Recharts, built from the supplied Google Stitch design.

- **Dashboard (`/`)**: IHSG, LQ45, IDX30, IDX80 cards, interactive IHSG chart (1D–1Y) and comparison table.
- **Watchlist (`/watchlist`)**: your own IDX stocks (e.g. BBCA, BBRI), saved in your browser, with a chart per stock.
- **API health (`/health`)**: live connectivity check of the data provider.

All numbers come from a real external source. There is no mock or sample data: if the source fails, the UI shows an error and keeps the last good data (marked stale).

## Quick start

```bash
npm install
npm run dev          # http://localhost:3000
```

Scripts: `npm run typecheck`, `npm run lint`, `npm run build`, `npm start`. Requires Node.js 20+.
No environment variables are required. Copy `.env.example` to `.env.local` only to override symbols.

## Data source

The only provider is the **Yahoo Finance chart endpoint**: unofficial, no API key, delayed.

- **Not guaranteed real-time.** The feed makes no real-time promise and the delay is not documented. The dashboard labels it "DELAYED" and shows the source's own timestamp as LAST UPDATE. During trading hours compare that time with the clock to see the actual lag.
- **Indices:** `^JKSE` (IHSG) and `^JKLQ45` (LQ45) work. IDX30 and IDX80 have no confirmed Yahoo symbol, so they show "unavailable" unless you set `YAHOO_SYMBOL_IDX30` / `YAHOO_SYMBOL_IDX80`.
- **Stocks:** IDX tickers use the `.JK` suffix (BBCA -> BBCA.JK).
- **Risks:** Yahoo may throttle or block datacenter IPs (including Vercel's), has no SLA, and its terms do not cover commercial use. Volume is converted from shares to lots (÷100), which is an unverified assumption.
- For real-time or production use, switch to a licensed data provider (see below).

### Freshness settings
- Server cache: 15 s for quotes while trading (5 min when closed); 30 s for 1D charts.
- The browser polls every 15 s (charts every 30 s on 1D) while the tab is visible.
- Responses send `s-maxage` so Vercel's CDN can serve repeated requests.

### Adding a licensed provider
1. Create `src/services/market-data/providers/<vendor>.ts` implementing `MarketDataProvider` (`provider.ts`).
2. Put response mapping in `normalizers/<vendor>.ts`.
3. Return it from `getProvider()` in `services/market-data/index.ts`.
4. Read the key with `getMarketDataApiKey()` (`MARKET_DATA_API_KEY`, server-side only; never `NEXT_PUBLIC_`).

Declare `dataMode` honestly (`realtime`, `delayed`); the badge and banner follow it.

## API routes

- `GET /api/market/indices`
- `GET /api/market/history?code=IHSG&range=1D` (`range`: 1D, 1W, 1M, 3M, 6M, 1Y)
- `GET /api/market/stocks?symbols=BBCA,BBRI` (max 12)
- `GET /api/market/stocks/BBCA/history?range=1M`
- `GET /api/health` (HTTP 503 when the provider is failing)

Errors use `{ "error": { "code", "message" } }` with 400 / 404 / 502 / 504.

## Project structure

```
src/
  app/                      pages (/, /watchlist, /health) and API route handlers
  components/ui/            shadcn-style primitives
  components/dashboard/     shared shell, cards, chart, table, banners, states
  components/watchlist/     watchlist page UI
  components/health/        health page UI
  hooks/                    polling, clock, watchlist hooks
  lib/                      format, cache, env, symbols, api helpers
  services/market-data/     provider interface, providers/, normalizers/, health, market hours
  types/market.ts           shared TypeScript interfaces
```

More indices (KOMPAS100, ISSI, INFOBANK15): add them to `services/market-data/indices.ts`, the `IndexCode` type, and `getYahooSymbol` in `lib/env.ts`.

## Market status

Computed from WIB time: Mon–Thu 09:00–12:00 and 13:30–16:00, Fri 09:00–11:30 and 14:00–16:00. **Public holidays are not modelled.**

## Deploy to Vercel

1. Push the repo to GitHub/GitLab/Bitbucket.
2. In Vercel: **Add New → Project**, import the repo (Next.js is auto-detected).
3. Add any symbol/key variables under **Settings → Environment Variables**, then deploy (or `vercel --prod`).
4. After deploying, open `/health` on your Vercel URL: Yahoo may block Vercel's IPs.

## Notes

- Fonts and Material Symbols load from Google Fonts, as in the Stitch export.
- `components.json` is included so `npx shadcn@latest add <component>` works.
- Sidebar items other than Overview and Watchlist are placeholders from the design.
- Informational only; not investment advice.
