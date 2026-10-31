import "server-only";
import type {
  DataMeta,
  DataMode,
  IndexHistory,
  MarketSnapshot,
  StockHistory,
  StocksSnapshot,
  TimeRange,
} from "@/types/market";
import { cached } from "@/lib/cache";
import { INDICES, getIndexDefinition } from "./indices";
import { getMarketStatus } from "./market-hours";
import { MarketDataError, type MarketDataProvider } from "./provider";
import { YahooProvider } from "./providers/yahoo";

let provider: MarketDataProvider | null = null;

/** The single active provider. To switch vendors, return a different MarketDataProvider here. */
export function getProvider(): MarketDataProvider {
  return (provider ??= new YahooProvider());
}

interface Fetched<T> {
  value: T;
  latencyMs: number;
  /** When the provider was actually called (stays constant on cache hits). */
  fetchedAt: string;
}

async function fetchTimed<T>(run: (p: MarketDataProvider) => Promise<T>): Promise<Fetched<T>> {
  const t0 = Date.now();
  const value = await run(getProvider());
  return { value, latencyMs: Date.now() - t0, fetchedAt: new Date().toISOString() };
}

function effectiveMode(p: MarketDataProvider, marketOpen: boolean): DataMode {
  // A delayed feed outside trading hours is simply the official close.
  return p.dataMode === "delayed" && !marketOpen ? "end-of-day" : p.dataMode;
}

function buildMeta(f: Fetched<unknown>, marketOpen: boolean, hit: boolean, elapsedMs: number): DataMeta {
  const p = getProvider();
  return {
    provider: p.id,
    providerLabel: p.label,
    dataMode: effectiveMode(p, marketOpen),
    delayMinutes: p.delayMinutes,
    fetchedAt: f.fetchedAt,
    latencyMs: hit ? elapsedMs : f.latencyMs,
    cached: hit,
  };
}

// Short while trading so numbers stay as fresh as the source allows; long when the market is closed.
const QUOTE_TTL_OPEN_MS = 15_000;
const QUOTE_TTL_CLOSED_MS = 5 * 60_000;

function historyTtl(range: TimeRange, closed: boolean): number {
  if (range !== "1D") return 15 * 60_000;
  return closed ? 10 * 60_000 : 30_000;
}

export async function getMarketSnapshot(): Promise<MarketSnapshot> {
  const status = getMarketStatus();
  const closed = status.state === "CLOSED";
  const started = Date.now();
  const { value: f, hit } = await cached("snapshot", closed ? QUOTE_TTL_CLOSED_MS : QUOTE_TTL_OPEN_MS, () =>
    fetchTimed((p) => p.getQuotes(INDICES)),
  );
  return {
    quotes: f.value.quotes,
    unavailable: f.value.unavailable,
    marketStatus: status,
    meta: buildMeta(f, !closed, hit, Date.now() - started),
  };
}

export async function getIndexHistory(code: string, range: TimeRange): Promise<IndexHistory> {
  const def = getIndexDefinition(code);
  if (!def) throw new MarketDataError(`Unknown index "${code}"`, "BAD_REQUEST", 400);

  const status = getMarketStatus();
  const closed = status.state === "CLOSED";
  const started = Date.now();
  const { value: f, hit } = await cached(`history:${def.code}:${range}`, historyTtl(range, closed), () =>
    fetchTimed((p) => p.getHistory(def, range)),
  );
  return {
    code: def.code,
    range,
    points: f.value.points,
    prevClose: f.value.prevClose,
    marketStatus: status,
    meta: buildMeta(f, !closed, hit, Date.now() - started),
  };
}

export async function getStocksSnapshot(symbols: string[]): Promise<StocksSnapshot> {
  const status = getMarketStatus();
  const closed = status.state === "CLOSED";
  const started = Date.now();
  const key = `stocks:${[...symbols].sort().join(",")}`;
  const { value: f, hit } = await cached(key, closed ? QUOTE_TTL_CLOSED_MS : QUOTE_TTL_OPEN_MS, () =>
    fetchTimed((p) => p.getStockQuotes(symbols)),
  );
  return {
    quotes: f.value.quotes,
    unavailable: f.value.unavailable,
    marketStatus: status,
    meta: buildMeta(f, !closed, hit, Date.now() - started),
  };
}

export async function getStockHistory(symbol: string, range: TimeRange): Promise<StockHistory> {
  const status = getMarketStatus();
  const closed = status.state === "CLOSED";
  const started = Date.now();
  const { value: f, hit } = await cached(`stock-history:${symbol}:${range}`, historyTtl(range, closed), () =>
    fetchTimed((p) => p.getStockHistory(symbol, range)),
  );
  return {
    symbol,
    range,
    points: f.value.points,
    prevClose: f.value.prevClose,
    marketStatus: status,
    meta: buildMeta(f, !closed, hit, Date.now() - started),
  };
}
