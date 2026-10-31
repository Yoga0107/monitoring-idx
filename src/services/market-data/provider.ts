import type {
  DataMode,
  HistoryPoint,
  IndexDefinition,
  IndexQuote,
  StockQuote,
  TimeRange,
} from "@/types/market";

export interface QuoteResult {
  quote: IndexQuote;
}

export interface HistoryResult {
  points: HistoryPoint[];
  prevClose: number | null;
}

/**
 * Implement this interface to plug in a new market data vendor.
 * Providers must return *normalized* data (see ../normalizers) and throw
 * `MarketDataError` for upstream failures.
 */
export interface MarketDataProvider {
  readonly id: string;
  readonly label: string;
  readonly dataMode: DataMode;
  readonly delayMinutes: number | null;
  /** Fetch quotes for the given indices. Indices that fail are reported, not thrown. */
  getQuotes(indices: IndexDefinition[]): Promise<{
    quotes: IndexQuote[];
    unavailable: { code: IndexDefinition["code"]; reason: string }[];
  }>;
  getHistory(index: IndexDefinition, range: TimeRange): Promise<HistoryResult>;
  /** IDX equities by ticker (no suffix). Unknown tickers are reported in `unavailable`, not thrown. */
  getStockQuotes(symbols: string[]): Promise<{
    quotes: StockQuote[];
    unavailable: { symbol: string; reason: string }[];
  }>;
  getStockHistory(symbol: string, range: TimeRange): Promise<HistoryResult>;
}

export class MarketDataError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "UPSTREAM_ERROR"
      | "UPSTREAM_TIMEOUT"
      | "NOT_CONFIGURED"
      | "NOT_SUPPORTED"
      | "NOT_FOUND"
      | "BAD_REQUEST" = "UPSTREAM_ERROR",
    public readonly status = 502,
  ) {
    super(message);
    this.name = "MarketDataError";
  }
}
