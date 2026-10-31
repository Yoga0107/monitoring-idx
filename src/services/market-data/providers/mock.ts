import type { HistoryPoint, IndexCode, IndexDefinition, IndexQuote, TimeRange } from "@/types/market";
import { MarketDataError, type HistoryResult, type MarketDataProvider } from "../provider";
import { getMarketStatus, toWib } from "../market-hours";

/**
 * MOCK PROVIDER — synthetic, deterministic data seeded from the Stitch design
 * values. Not real market data. Used when MARKET_DATA_PROVIDER is unset.
 */
const BASE: Record<IndexCode, { last: number; change: number; volumeLots: number }> = {
  IHSG: { last: 7788.98, change: 42.15, volumeLots: 148_200_000 },
  LQ45: { last: 962.3, change: 6.45, volumeLots: 62_800_000 },
  IDX30: { last: 495.12, change: -1.82, volumeLots: 38_400_000 },
  IDX80: { last: 134.78, change: 0.89, volumeLots: 91_300_000 },
};

const WIB_MS = 7 * 3600_000;
const DAY_MS = 86_400_000;
const RANGE_CONFIG: Record<TimeRange, { days: number; stepMin: number | null; drift: number }> = {
  "1D": { days: 1, stepMin: 5, drift: 0 },
  "1W": { days: 5, stepMin: 30, drift: 0.015 },
  "1M": { days: 21, stepMin: null, drift: 0.035 },
  "3M": { days: 63, stepMin: null, drift: 0.07 },
  "6M": { days: 126, stepMin: null, drift: 0.1 },
  "1Y": { days: 252, stepMin: null, drift: 0.16 },
};

function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** UTC ms of 00:00 WIB for the WIB calendar day containing `ms`. */
function wibMidnight(ms: number): number {
  return Math.floor((ms + WIB_MS) / DAY_MS) * DAY_MS - WIB_MS;
}

function isWeekday(dayStartMs: number): boolean {
  const d = toWib(new Date(dayStartMs + 12 * 3600_000)).day;
  return d !== 0 && d !== 6;
}

/** Last trading day (WIB midnight) that has started, and the end timestamp of its data. */
function latestSession(now: Date): { dayStart: number; endMs: number } {
  let dayStart = wibMidnight(now.getTime());
  const { minutes } = toWib(now);
  if (minutes < 9 * 60) dayStart -= DAY_MS;
  while (!isWeekday(dayStart)) dayStart -= DAY_MS;
  const sessionClose = dayStart + (15 * 60 + 50) * 60_000;
  const sameDay = wibMidnight(now.getTime()) === dayStart;
  const endMs = sameDay ? Math.min(now.getTime(), sessionClose) : sessionClose;
  return { dayStart, endMs: Math.max(endMs, dayStart + 9 * 3600_000) };
}

function timestampsFor(range: TimeRange, now: Date): number[] {
  const { days, stepMin } = RANGE_CONFIG[range];
  const { dayStart, endMs } = latestSession(now);
  const out: number[] = [];
  let cursor = dayStart;
  const tradingDays: number[] = [];
  while (tradingDays.length < days) {
    if (isWeekday(cursor)) tradingDays.unshift(cursor);
    cursor -= DAY_MS;
  }
  for (const day of tradingDays) {
    if (stepMin === null) {
      out.push(day + 16 * 3600_000);
      continue;
    }
    const dayEnd = day === dayStart ? endMs : day + (15 * 60 + 50) * 60_000;
    for (let t = day + 9 * 3600_000; t <= dayEnd; t += stepMin * 60_000) {
      if (getMarketStatus(new Date(t)).state !== "BREAK") out.push(t);
    }
  }
  return out;
}

function buildSeries(def: IndexDefinition, range: TimeRange, now: Date): HistoryPoint[] {
  const base = BASE[def.code];
  const stamps = timestampsFor(range, now);
  const n = stamps.length;
  const { dayStart } = latestSession(now);
  const rnd = mulberry32(hashSeed(`${def.code}|${range}|${dayStart}`));

  const prevClose = base.last - base.change;
  const { drift } = RANGE_CONFIG[range];
  const start =
    range === "1D"
      ? prevClose * (1 + (rnd() - 0.5) * 0.003)
      : base.last * (1 - (drift * (0.4 + rnd() * 1.2) - drift * 0.4));
  const end = base.last;
  const vol = base.last * (range === "1D" ? 0.0009 : range === "1W" ? 0.0016 : 0.0062);

  const walk: number[] = [0];
  for (let i = 1; i < n; i++) walk.push((walk[i - 1] ?? 0) + (rnd() - 0.5) * vol * 2);
  const walkEnd = walk[n - 1] ?? 0;

  return stamps.map((t, i) => {
    const f = n > 1 ? i / (n - 1) : 1;
    const bridged = (walk[i] ?? 0) - walkEnd * f;
    return { t, close: round2(start + (end - start) * f + bridged) };
  });
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

function downsample(values: number[], max: number): number[] {
  if (values.length <= max) return values;
  const step = (values.length - 1) / (max - 1);
  return Array.from({ length: max }, (_, i) => values[Math.round(i * step)] ?? 0);
}

export class MockProvider implements MarketDataProvider {
  readonly id = "mock";
  readonly label = "MOCK DATA FEED";
  readonly dataMode = "mock" as const;
  readonly delayMinutes = null;

  async getQuotes(indices: IndexDefinition[]) {
    const now = new Date();
    const quotes: IndexQuote[] = indices.map((def) => {
      const base = BASE[def.code];
      const series = buildSeries(def, "1D", now);
      const closes = series.map((p) => p.close);
      const prevClose = round2(base.last - base.change);
      const last = closes[closes.length - 1] ?? base.last;
      const change = round2(last - prevClose);
      return {
        code: def.code,
        name: def.name,
        description: def.description,
        tag: def.tag,
        last,
        change,
        changePct: round2((change / prevClose) * 100),
        open: closes[0] ?? null,
        high: Math.max(...closes),
        low: Math.min(...closes),
        prevClose,
        volumeLots: base.volumeLots,
        updatedAt: new Date(series[series.length - 1]?.t ?? now.getTime()).toISOString(),
        sparkline: downsample(closes, 40),
      };
    });
    return { quotes, unavailable: [] };
  }

  async getHistory(def: IndexDefinition, range: TimeRange): Promise<HistoryResult> {
    if (!BASE[def.code]) throw new MarketDataError(`Unknown index ${def.code}`, "NOT_SUPPORTED", 404);
    const points = buildSeries(def, range, new Date());
    const prevClose = range === "1D" ? round2(BASE[def.code].last - BASE[def.code].change) : null;
    return { points, prevClose };
  }
}
