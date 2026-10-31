import type { HistoryPoint, IndexDefinition, IndexQuote } from "@/types/market";
import { MarketDataError } from "../provider";

/** Subset of Yahoo's /v8/finance/chart response that we rely on. */
export interface YahooChartResponse {
  chart?: {
    result?: Array<{
      meta?: {
        regularMarketPrice?: number;
        regularMarketDayHigh?: number;
        regularMarketDayLow?: number;
        regularMarketVolume?: number;
        regularMarketTime?: number;
        previousClose?: number;
        chartPreviousClose?: number;
      };
      timestamp?: number[];
      indicators?: {
        quote?: Array<{
          open?: Array<number | null>;
          high?: Array<number | null>;
          low?: Array<number | null>;
          close?: Array<number | null>;
          volume?: Array<number | null>;
        }>;
      };
    }> | null;
    error?: { code?: string; description?: string } | null;
  };
}

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const round2 = (v: number) => Math.round(v * 100) / 100;

export function normalizeYahooHistory(raw: YahooChartResponse): {
  points: HistoryPoint[];
  prevClose: number | null;
} {
  const result = unwrap(raw);
  const closes = result.indicators?.quote?.[0]?.close ?? [];
  const stamps = result.timestamp ?? [];
  const points: HistoryPoint[] = [];
  stamps.forEach((ts, i) => {
    const close = closes[i];
    if (isNum(close)) points.push({ t: ts * 1000, close: round2(close) });
  });
  const prev = result.meta?.previousClose ?? result.meta?.chartPreviousClose;
  return { points, prevClose: isNum(prev) ? round2(prev) : null };
}

/** Normalize a 1-day, intraday chart response into an IndexQuote. */
export function normalizeYahooQuote(raw: YahooChartResponse, def: IndexDefinition): IndexQuote {
  const result = unwrap(raw);
  const meta = result.meta ?? {};
  const q = result.indicators?.quote?.[0] ?? {};
  const closes = (q.close ?? []).filter(isNum);
  const highs = (q.high ?? []).filter(isNum);
  const lows = (q.low ?? []).filter(isNum);
  const open = (q.open ?? []).find(isNum) ?? null;

  const last = isNum(meta.regularMarketPrice) ? meta.regularMarketPrice : closes[closes.length - 1];
  const prevClose = meta.previousClose ?? meta.chartPreviousClose;
  if (!isNum(last) || !isNum(prevClose) || prevClose === 0) {
    throw new MarketDataError(`Incomplete quote for ${def.code}`, "UPSTREAM_ERROR");
  }

  const high = meta.regularMarketDayHigh ?? (highs.length ? Math.max(...highs) : last);
  const low = meta.regularMarketDayLow ?? (lows.length ? Math.min(...lows) : last);
  // Yahoo reports IDX volume in shares (lembar); 1 lot = 100 shares.
  const rawVolume = meta.regularMarketVolume ?? (q.volume ?? []).filter(isNum).reduce((a, b) => a + b, 0);
  const volumeLots = isNum(rawVolume) && rawVolume > 0 ? Math.round(rawVolume / 100) : null;

  const change = last - prevClose;
  const updatedMs = (meta.regularMarketTime ?? result.timestamp?.[result.timestamp.length - 1] ?? Date.now() / 1000) * 1000;

  return {
    code: def.code,
    name: def.name,
    description: def.description,
    tag: def.tag,
    last: round2(last),
    change: round2(change),
    changePct: round2((change / prevClose) * 100),
    open: open === null ? null : round2(open),
    high: round2(high),
    low: round2(low),
    prevClose: round2(prevClose),
    volumeLots,
    updatedAt: new Date(updatedMs).toISOString(),
    sparkline: downsample(closes.map(round2), 40),
  };
}

function unwrap(raw: YahooChartResponse) {
  const err = raw.chart?.error;
  if (err) throw new MarketDataError(err.description ?? err.code ?? "Yahoo returned an error", "UPSTREAM_ERROR");
  const result = raw.chart?.result?.[0];
  if (!result) throw new MarketDataError("Yahoo returned no data for this symbol", "UPSTREAM_ERROR");
  return result;
}

function downsample(values: number[], max: number): number[] {
  if (values.length <= max) return values;
  const step = (values.length - 1) / (max - 1);
  return Array.from({ length: max }, (_, i) => values[Math.round(i * step)] ?? 0);
}
