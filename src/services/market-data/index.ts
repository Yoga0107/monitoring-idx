import "server-only";
import type { DataMeta, DataMode, IndexHistory, MarketSnapshot, TimeRange } from "@/types/market";
import { cached } from "@/lib/cache";
import { getProviderId } from "@/lib/env";
import { INDICES, getIndexDefinition } from "./indices";
import { getMarketStatus } from "./market-hours";
import { MarketDataError, type MarketDataProvider } from "./provider";
import { MockProvider } from "./providers/mock";
import { YahooProvider } from "./providers/yahoo";

let provider: MarketDataProvider | null = null;

/** Add new vendors here. */
export function getProvider(): MarketDataProvider {
  if (!provider) provider = getProviderId() === "yahoo" ? new YahooProvider() : new MockProvider();
  return provider;
}

function effectiveMode(p: MarketDataProvider, marketOpen: boolean): DataMode {
  // A delayed feed outside trading hours is simply the official close.
  return p.dataMode === "delayed" && !marketOpen ? "end-of-day" : p.dataMode;
}

function buildMeta(p: MarketDataProvider, marketOpen: boolean, latencyMs: number, hit: boolean): DataMeta {
  return {
    provider: p.id,
    providerLabel: p.label,
    dataMode: effectiveMode(p, marketOpen),
    delayMinutes: p.delayMinutes,
    fetchedAt: new Date().toISOString(),
    latencyMs,
    cached: hit,
  };
}

const SNAPSHOT_TTL_OPEN_MS = 30_000;
const SNAPSHOT_TTL_CLOSED_MS = 5 * 60_000;

export async function getMarketSnapshot(): Promise<MarketSnapshot> {
  const p = getProvider();
  const status = getMarketStatus();
  const ttl = status.state === "CLOSED" ? SNAPSHOT_TTL_CLOSED_MS : SNAPSHOT_TTL_OPEN_MS;

  const started = Date.now();
  const { value, hit } = await cached(`snapshot:${p.id}`, ttl, async () => {
    const t0 = Date.now();
    const data = await p.getQuotes(INDICES);
    return { ...data, latencyMs: Date.now() - t0 };
  });

  return {
    quotes: value.quotes,
    unavailable: value.unavailable,
    marketStatus: status,
    meta: buildMeta(p, status.state !== "CLOSED", hit ? Date.now() - started : value.latencyMs, hit),
  };
}

export async function getIndexHistory(code: string, range: TimeRange): Promise<IndexHistory> {
  const def = getIndexDefinition(code);
  if (!def) throw new MarketDataError(`Unknown index "${code}"`, "BAD_REQUEST", 400);

  const p = getProvider();
  const status = getMarketStatus();
  const ttl = range === "1D" ? (status.state === "CLOSED" ? 10 * 60_000 : 60_000) : 15 * 60_000;

  const started = Date.now();
  const { value, hit } = await cached(`history:${p.id}:${def.code}:${range}`, ttl, async () => {
    const t0 = Date.now();
    const data = await p.getHistory(def, range);
    return { ...data, latencyMs: Date.now() - t0 };
  });

  return {
    code: def.code,
    range,
    points: value.points,
    prevClose: value.prevClose,
    marketStatus: status,
    meta: buildMeta(p, status.state !== "CLOSED", hit ? Date.now() - started : value.latencyMs, hit),
  };
}
