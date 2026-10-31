/** Shared types used by the API routes, services and UI. */

export type IndexCode = "IHSG" | "LQ45" | "IDX30" | "IDX80";

export const TIME_RANGES = ["1D", "1W", "1M", "3M", "6M", "1Y"] as const;
export type TimeRange = (typeof TIME_RANGES)[number];

/** How fresh the numbers are. Always surfaced in the UI. */
export type DataMode = "realtime" | "delayed" | "end-of-day" | "mock";

/** Data source the user (or the server default) asks for. "auto" = Yahoo, falling back to mock. */
export const SOURCE_CHOICES = ["auto", "yahoo", "mock"] as const;
export type SourceChoice = (typeof SOURCE_CHOICES)[number];

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
  /** What was requested; `provider` is what actually answered. */
  requestedSource: SourceChoice;
  /** True when "auto" could not reach Yahoo and fell back to mock data. */
  fallback: boolean;
  fallbackReason: string | null;
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
