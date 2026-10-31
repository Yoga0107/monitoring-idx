import type { IndexDefinition, TimeRange } from "@/types/market";
import { getYahooSymbol } from "@/lib/env";
import { MarketDataError, type HistoryResult, type MarketDataProvider } from "../provider";
import {
  normalizeYahooHistory,
  normalizeYahooQuote,
  normalizeYahooStock,
  type YahooChartResponse,
} from "../normalizers/yahoo";

/**
 * Yahoo Finance chart endpoint (unofficial, no API key, delayed).
 * Verified public symbols: ^JKSE (IHSG) and ^JKLQ45 (LQ45). IDX30 / IDX80 have no
 * confirmed Yahoo symbol: set YAHOO_SYMBOL_IDX30 / YAHOO_SYMBOL_IDX80 if you find one.
 * Yahoo may throttle or block datacenter IPs; treat as a prototype source.
 */
const BASE_URL = "https://query1.finance.yahoo.com/v8/finance/chart/";
const TIMEOUT_MS = 8000;

const RANGE_PARAMS: Record<TimeRange, { range: string; interval: string }> = {
  "1D": { range: "1d", interval: "5m" },
  "1W": { range: "5d", interval: "30m" },
  "1M": { range: "1mo", interval: "1d" },
  "3M": { range: "3mo", interval: "1d" },
  "6M": { range: "6mo", interval: "1d" },
  "1Y": { range: "1y", interval: "1d" },
};

async function fetchChart(symbol: string, range: TimeRange): Promise<YahooChartResponse> {
  const { range: r, interval } = RANGE_PARAMS[range];
  const url = `${BASE_URL}${encodeURIComponent(symbol)}?range=${r}&interval=${interval}&includePrePost=false`;
  let res: Response;
  try {
    res = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; MarketInsight/0.1)", Accept: "application/json" },
    });
  } catch (e) {
    const timedOut = e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError");
    throw new MarketDataError(
      timedOut ? "Market data provider timed out" : "Could not reach the market data provider",
      timedOut ? "UPSTREAM_TIMEOUT" : "UPSTREAM_ERROR",
      504,
    );
  }
  if (res.status === 404) {
    throw new MarketDataError("Symbol not found on Yahoo Finance", "NOT_FOUND", 404);
  }
  if (!res.ok) {
    throw new MarketDataError(`Market data provider responded with HTTP ${res.status}`, "UPSTREAM_ERROR");
  }
  return (await res.json()) as YahooChartResponse;
}

export class YahooProvider implements MarketDataProvider {
  readonly id = "yahoo";
  readonly label = "YAHOO FINANCE (UNOFFICIAL)";
  readonly dataMode = "delayed" as const;
  /** Unknown: this unofficial feed gives no delay guarantee, so none is claimed. */
  readonly delayMinutes = null;

  async getQuotes(indices: IndexDefinition[]) {
    const settled = await Promise.allSettled(
      indices.map(async (def) => {
        const symbol = getYahooSymbol(def.code);
        if (!symbol) throw new MarketDataError("No Yahoo symbol configured", "NOT_CONFIGURED");
        return normalizeYahooQuote(await fetchChart(symbol, "1D"), def);
      }),
    );
    const quotes: Awaited<ReturnType<MarketDataProvider["getQuotes"]>>["quotes"] = [];
    const unavailable: Awaited<ReturnType<MarketDataProvider["getQuotes"]>>["unavailable"] = [];
    settled.forEach((r, i) => {
      const def = indices[i];
      if (!def) return;
      if (r.status === "fulfilled") quotes.push(r.value);
      else unavailable.push({ code: def.code, reason: r.reason instanceof Error ? r.reason.message : "Unknown error" });
    });
    if (quotes.length === 0) {
      throw new MarketDataError(unavailable[0]?.reason ?? "No index data available", "UPSTREAM_ERROR");
    }
    return { quotes, unavailable };
  }

  async getHistory(def: IndexDefinition, range: TimeRange): Promise<HistoryResult> {
    const symbol = getYahooSymbol(def.code);
    if (!symbol) throw new MarketDataError(`No Yahoo symbol configured for ${def.code}`, "NOT_CONFIGURED", 404);
    return normalizeYahooHistory(await fetchChart(symbol, range));
  }

  /** IDX equities use the ".JK" suffix on Yahoo (BBCA -> BBCA.JK). */
  async getStockQuotes(symbols: string[]) {
    const settled = await Promise.allSettled(
      symbols.map(async (sym) => normalizeYahooStock(await fetchChart(`${sym}.JK`, "1D"), sym)),
    );
    const quotes: Awaited<ReturnType<MarketDataProvider["getStockQuotes"]>>["quotes"] = [];
    const unavailable: Awaited<ReturnType<MarketDataProvider["getStockQuotes"]>>["unavailable"] = [];
    let hardError: MarketDataError | null = null;
    settled.forEach((r, i) => {
      const symbol = symbols[i];
      if (!symbol) return;
      if (r.status === "fulfilled") {
        quotes.push(r.value);
        return;
      }
      const e = r.reason;
      const err = e instanceof MarketDataError ? e : new MarketDataError(e instanceof Error ? e.message : "Unknown error");
      unavailable.push({ symbol, reason: err.message });
      // A wrong ticker is the user's typo, not an outage: only real failures (network, HTTP errors) may fail the whole request.
      if (err.code !== "NOT_FOUND") hardError ??= err;
    });
    if (quotes.length === 0 && hardError) throw hardError;
    return { quotes, unavailable };
  }

  async getStockHistory(symbol: string, range: TimeRange): Promise<HistoryResult> {
    return normalizeYahooHistory(await fetchChart(`${symbol}.JK`, range));
  }
}
