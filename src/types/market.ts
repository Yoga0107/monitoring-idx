/** Shared types used by the API routes, services and UI. */

export type IndexCode = "IHSG" | "LQ45" | "IDX30" | "IDX80";

export const TIME_RANGES = ["1D", "1W", "1M", "3M", "6M", "1Y"] as const;
export type TimeRange = (typeof TIME_RANGES)[number];

/** How fresh the numbers are. Always surfaced in the UI. */
export type DataMode = "realtime" | "delayed" | "end-of-day";

export type MarketState = "OPEN" | "BREAK" | "CLOSED";

export interface MarketStatus {
  state: MarketState;
  /** Human label, e.g. "SESI I", "ISTIRAHAT", "TUTUP". */
  session: string;
  /** Long label for the header pill, e.g. "IDX: OPEN - SESI I (WIB)". */
  label: string;
}

export interface IndexDefinition {
  code: IndexCode;
  name: string;
  description: string;
  /** Small badge on the summary card. */
  tag: string;
}

export interface IndexQuote {
  code: IndexCode;
  name: string;
  description: string;
  tag: string;
  last: number;
  change: number;
  changePct: number;
  open: number | null;
  high: number;
  low: number;
  prevClose: number;
  /** Lots (1 lot = 100 shares). Null when the provider does not supply it. */
  volumeLots: number | null;
  /** ISO timestamp of the last trade/quote reported by the provider. */
  updatedAt: string;
  /** Downsampled intraday closes for the card sparkline. */
  sparkline: number[];
}

export interface DataMeta {
  provider: string;
  providerLabel: string;
  dataMode: DataMode;
  /** Known delay in minutes (delayed feeds only). */
  delayMinutes: number | null;
  /** ISO timestamp when our server fetched the data. */
  fetchedAt: string;
  /** Time spent talking to the provider, in ms. */
  latencyMs: number;
  /** True when served from the in-memory cache. */
  cached: boolean;
}

export interface MarketSnapshot {
  quotes: IndexQuote[];
  /** Indices the provider could not return (e.g. no symbol configured). */
  unavailable: { code: IndexCode; reason: string }[];
  marketStatus: MarketStatus;
  meta: DataMeta;
}

export interface HistoryPoint {
  /** Unix epoch ms. */
  t: number;
  close: number;
}

export interface IndexHistory {
  code: IndexCode;
  range: TimeRange;
  points: HistoryPoint[];
  /** Reference line for the 1D view. */
  prevClose: number | null;
  marketStatus: MarketStatus;
  meta: DataMeta;
}

export interface ApiErrorBody {
  error: { code: string; message: string };
}

/* ---------- Health check ---------- */

export type HealthStatus = "ok" | "warn" | "fail";

export interface HealthCheck {
  name: string;
  status: HealthStatus;
  /** Time the check took; null when it was skipped. */
  latencyMs: number | null;
  detail: string;
}

export interface ProviderHealth {
  id: string;
  label: string;
  dataMode: DataMode;
  status: HealthStatus;
  checks: HealthCheck[];
  /** Newest provider-reported data timestamp among successful checks. */
  latestDataAt: string | null;
}

export interface HealthReport {
  checkedAt: string;
  marketStatus: MarketStatus;
  overall: { status: HealthStatus; message: string };
  providers: ProviderHealth[];
  config: {
    yahooSymbols: { code: IndexCode; symbol: string | null }[];
    nodeVersion: string;
    vercelRegion: string | null;
  };
}

/* ---------- Stocks (watchlist) ---------- */

export interface StockQuote {
  /** IDX ticker without suffix, e.g. "BBCA". */
  symbol: string;
  name: string | null;
  last: number;
  change: number;
  changePct: number;
  open: number | null;
  high: number;
  low: number;
  prevClose: number;
  volumeLots: number | null;
  updatedAt: string;
  sparkline: number[];
}

export interface StocksSnapshot {
  quotes: StockQuote[];
  unavailable: { symbol: string; reason: string }[];
  marketStatus: MarketStatus;
  meta: DataMeta;
}

export interface StockHistory {
  symbol: string;
  range: TimeRange;
  points: HistoryPoint[];
  prevClose: number | null;
  marketStatus: MarketStatus;
  meta: DataMeta;
}
