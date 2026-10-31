import "server-only";
import type { HealthCheck, HealthReport, HealthStatus, IndexDefinition, ProviderHealth } from "@/types/market";
import { cached } from "@/lib/cache";
import { getYahooSymbol } from "@/lib/env";
import { getProvider } from ".";
import { INDICES } from "./indices";
import { getMarketStatus } from "./market-hours";
import type { MarketDataProvider } from "./provider";

async function timed<T>(fn: () => Promise<T>): Promise<{ ok: true; value: T; ms: number } | { ok: false; error: string; ms: number }> {
  const t0 = Date.now();
  try {
    return { ok: true, value: await fn(), ms: Date.now() - t0 };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error", ms: Date.now() - t0 };
  }
}

function rollUp(checks: HealthCheck[]): HealthStatus {
  const live = checks.filter((c) => c.latencyMs !== null); // ignore skipped checks
  if (live.length > 0 && live.every((c) => c.status === "fail")) return "fail";
  if (checks.some((c) => c.status !== "ok")) return "warn";
  return "ok";
}

async function checkProvider(p: MarketDataProvider, marketState: ReturnType<typeof getMarketStatus>["state"]): Promise<ProviderHealth> {
  const now = Date.now();
  let latest: string | null = null;

  const indexChecks = await Promise.all(
    INDICES.map(async (def: IndexDefinition): Promise<HealthCheck> => {
      const name = `Quote ${def.code}`;
      if (!getYahooSymbol(def.code)) {
        return { name, status: "warn", latencyMs: null, detail: `No symbol configured (set YAHOO_SYMBOL_${def.code}). Skipped.` };
      }
      const r = await timed(() => p.getQuotes([def]));
      if (!r.ok) return { name, status: "fail", latencyMs: r.ms, detail: r.error };
      const q = r.value.quotes[0];
      if (!q) return { name, status: "fail", latencyMs: r.ms, detail: "Provider returned no quote." };
      if (!latest || q.updatedAt > latest) latest = q.updatedAt;
      const ageMin = Math.max(0, Math.round((now - new Date(q.updatedAt).getTime()) / 60_000));
      const base = `Last ${q.last.toFixed(2)}, data time ${q.updatedAt} (${ageMin} min old).`;
      if (marketState === "OPEN" && ageMin > 30) {
        return { name, status: "warn", latencyMs: r.ms, detail: `${base} Stale while the market is open.` };
      }
      const note = marketState === "OPEN" ? "" : " Market is not trading, so the data time is not expected to advance.";
      return { name, status: "ok", latencyMs: r.ms, detail: base + note };
    }),
  );

  const ihsg = INDICES[0];
  const historyCheck = await (async (): Promise<HealthCheck> => {
    if (!ihsg) return { name: "History IHSG 1D", status: "warn", latencyMs: null, detail: "No indices registered." };
    const r = await timed(() => p.getHistory(ihsg, "1D"));
    if (!r.ok) return { name: "History IHSG 1D", status: "fail", latencyMs: r.ms, detail: r.error };
    const n = r.value.points.length;
    return n >= 2
      ? { name: "History IHSG 1D", status: "ok", latencyMs: r.ms, detail: `${n} data points.` }
      : { name: "History IHSG 1D", status: "warn", latencyMs: r.ms, detail: `Only ${n} data point(s) returned.` };
  })();

  const stockCheck = await (async (): Promise<HealthCheck> => {
    const name = "Stock BBCA";
    const r = await timed(() => p.getStockQuotes(["BBCA"]));
    if (!r.ok) return { name, status: "fail", latencyMs: r.ms, detail: r.error };
    const q = r.value.quotes[0];
    if (!q) return { name, status: "warn", latencyMs: r.ms, detail: r.value.unavailable[0]?.reason ?? "No quote returned." };
    return { name, status: "ok", latencyMs: r.ms, detail: `Last ${q.last} (${q.updatedAt}). Watchlist stocks work.` };
  })();

  const checks = [...indexChecks, historyCheck, stockCheck];
  return { id: p.id, label: p.label, dataMode: p.dataMode, status: rollUp(checks), checks, latestDataAt: latest };
}

function summarize(provider: ProviderHealth): HealthReport["overall"] {
  if (provider.status === "ok") return { status: "ok", message: "The data provider is reachable and returning data." };
  if (provider.status === "warn") return { status: "warn", message: "The provider works, but some checks were skipped or flagged. See below." };
  return { status: "fail", message: "The data provider is failing. The dashboard will show errors until it recovers." };
}

/** Calls the provider directly (bypassing the data cache). The report itself is cached for 15 s. */
export async function runHealthCheck(): Promise<HealthReport> {
  const { value } = await cached("health", 15_000, async (): Promise<HealthReport> => {
    const status = getMarketStatus();
    const provider = await checkProvider(getProvider(), status.state);
    return {
      checkedAt: new Date().toISOString(),
      marketStatus: status,
      overall: summarize(provider),
      providers: [provider],
      config: {
        yahooSymbols: INDICES.map((i) => ({ code: i.code, symbol: getYahooSymbol(i.code) || null })),
        nodeVersion: process.version,
        vercelRegion: process.env.VERCEL_REGION ?? null,
      },
    };
  });
  return value;
}
