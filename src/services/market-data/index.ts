import "server-only";
import type { DataMeta, DataMode, IndexHistory, MarketSnapshot, SourceChoice, TimeRange } from "@/types/market";
import { cached } from "@/lib/cache";
import { getDefaultSource } from "@/lib/env";
import { INDICES, getIndexDefinition } from "./indices";
import { getMarketStatus } from "./market-hours";
import { MarketDataError, type MarketDataProvider } from "./provider";
import { MockProvider } from "./providers/mock";
import { YahooProvider } from "./providers/yahoo";

type ProviderId = "mock" | "yahoo";
const instances: Partial<Record<ProviderId, MarketDataProvider>> = {};

/** Add new vendors here. */
export function getProvider(id: ProviderId): MarketDataProvider {
  return (instances[id] ??= id === "yahoo" ? new YahooProvider() : new MockProvider());
}

interface Resolved<T> {
  value: T;
  used: ProviderId;
  fallbackReason: string | null;
  latencyMs: number;
}

/** Runs `run` against the requested source. "auto" = Yahoo first, mock if Yahoo fails. */
async function withSource<T>(source: SourceChoice, run: (p: MarketDataProvider) => Promise<T>): Promise<Resolved<T>> {
  const t0 = Date.now();
  if (source !== "auto") {
    const value = await run(getProvider(source));
    return { value, used: source, fallbackReason: null, latencyMs: Date.now() - t0 };
  }
  try {
    const value = await run(getProvider("yahoo"));
    return { value, used: "yahoo", fallbackReason: null, latencyMs: Date.now() - t0 };
  } catch (e) {
    const reason = e instanceof Error ? e.message : "Unknown error";
    console.warn(`[market-data] auto: Yahoo failed (${reason}); using mock data`);
    const value = await run(getProvider("mock"));
    return { value, used: "mock", fallbackReason: reason, latencyMs: Date.now() - t0 };
  }
}

function effectiveMode(p: MarketDataProvider, marketOpen: boolean): DataMode {
  // A delayed feed outside trading hours is simply the official close.
  return p.dataMode === "delayed" && !marketOpen ? "end-of-day" : p.dataMode;
}

function buildMeta(r: Resolved<unknown>, requested: SourceChoice, marketOpen: boolean, hit: boolean, elapsedMs: number): DataMeta {
  const p = getProvider(r.used);
  return {
    provider: p.id,
    providerLabel: p.label,
    dataMode: effectiveMode(p, marketOpen),
    delayMinutes: p.delayMinutes,
    fetchedAt: new Date().toISOString(),
    latencyMs: hit ? elapsedMs : r.latencyMs,
    cached: hit,
    requestedSource: requested,
    fallback: r.fallbackReason !== null,
    fallbackReason: r.fallbackReason,
  };
}

const SNAPSHOT_TTL_OPEN_MS = 30_000;
const SNAPSHOT_TTL_CLOSED_MS = 5 * 60_000;

export async function getMarketSnapshot(source?: SourceChoice): Promise<MarketSnapshot> {
  const requested = source ?? getDefaultSource();
  const status = getMarketStatus();
  const ttl = status.state === "CLOSED" ? SNAPSHOT_TTL_CLOSED_MS : SNAPSHOT_TTL_OPEN_MS;

  const started = Date.now();
  const { value: r, hit } = await cached(`snapshot:${requested}`, ttl, () =>
    withSource(requested, (p) => p.getQuotes(INDICES)),
  );

  return {
    quotes: r.value.quotes,
    unavailable: r.value.unavailable,
    marketStatus: status,
    meta: buildMeta(r, requested, status.state !== "CLOSED", hit, Date.now() - started),
  };
}

export async function getIndexHistory(code: string, range: TimeRange, source?: SourceChoice): Promise<IndexHistory> {
  const def = getIndexDefinition(code);
  if (!def) throw new MarketDataError(`Unknown index "${code}"`, "BAD_REQUEST", 400);

  const requested = source ?? getDefaultSource();
  const status = getMarketStatus();
  const ttl = range === "1D" ? (status.state === "CLOSED" ? 10 * 60_000 : 60_000) : 15 * 60_000;

  const started = Date.now();
  const { value: r, hit } = await cached(`history:${requested}:${def.code}:${range}`, ttl, () =>
    withSource(requested, (p) => p.getHistory(def, range)),
  );

  return {
    code: def.code,
    range,
    points: r.value.points,
    prevClose: r.value.prevClose,
    marketStatus: status,
    meta: buildMeta(r, requested, status.state !== "CLOSED", hit, Date.now() - started),
  };
}
