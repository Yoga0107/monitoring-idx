"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/dashboard/app-shell";
import { PriceChart } from "@/components/dashboard/price-chart";
import { EmptyPanel, ErrorPanel } from "@/components/dashboard/states";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { usePolledJson } from "@/hooks/use-polled-json";
import { useWatchlist, type AddResult } from "@/hooks/use-watchlist";
import { fmtLots, fmtNum, fmtPct, fmtSigned, toneOf, toneText, tonePill } from "@/lib/format";
import { MAX_SYMBOLS } from "@/lib/symbols";
import { cn } from "@/lib/utils";
import { getMarketStatus } from "@/services/market-data/market-hours";
import type { MarketStatus, StockHistory, StockQuote, StocksSnapshot, TimeRange } from "@/types/market";

const SUGGESTIONS = ["BBCA", "BBRI", "BMRI", "TLKM", "ASII"];
const MESSAGES: Record<Exclude<AddResult, "added">, string> = {
  invalid: "Enter an IDX ticker such as BBCA (2–6 letters or digits).",
  exists: "That stock is already in your watchlist.",
  full: `Your watchlist is full (max ${MAX_SYMBOLS}). Remove a stock first.`,
};

const priceDecimals = (q: { last: number } | null) => (q && !Number.isInteger(q.last) ? 2 : 0);

export function WatchlistView() {
  const { symbols, add, remove } = useWatchlist();
  const [input, setInput] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [range, setRange] = useState<TimeRange>("1D");

  // Market status is time-only, so it can show even before any data is requested.
  const [clockStatus, setClockStatus] = useState<MarketStatus | null>(null);
  useEffect(() => setClockStatus(getMarketStatus()), []);

  const list = symbols ?? [];
  const stocks = usePolledJson<StocksSnapshot>(
    list.length ? `/api/market/stocks?symbols=${list.join(",")}` : null,
    15_000,
  );

  const selected = picked && list.includes(picked) ? picked : (list[0] ?? null);
  const hist = usePolledJson<StockHistory>(
    selected ? `/api/market/stocks/${selected}/history?range=${range}` : null,
    range === "1D" ? 30_000 : 0,
  );

  const quoteOf = useMemo(() => new Map<string, StockQuote>((stocks.data?.quotes ?? []).map((q) => [q.symbol, q])), [stocks.data]);
  const selectedQuote = selected ? (quoteOf.get(selected) ?? null) : null;
  const lastUpdate = stocks.data?.quotes.reduce<string | null>((max, q) => (!max || q.updatedAt > max ? q.updatedAt : max), null) ?? null;

  function submit(raw: string) {
    const { result, symbol } = add(raw);
    if (result === "added") {
      setInput("");
      setMessage(null);
      setPicked(symbol);
    } else {
      setMessage(MESSAGES[result]);
    }
  }

  const waiting = stocks.loading || (!stocks.data && !stocks.error && list.length > 0);

  return (
    <AppShell
      status={stocks.data?.marketStatus ?? clockStatus}
      meta={stocks.data?.meta ?? null}
      lastUpdate={lastUpdate}
      error={stocks.error}
      loading={stocks.loading}
      refreshing={stocks.refreshing || hist.refreshing}
      onRefresh={() => {
        stocks.refresh();
        hist.refresh();
      }}
      hasData={!!stocks.data}
    >
      <section aria-label="Watchlist" className="bg-surface-container-low border border-outline-variant rounded-lg p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-outline-variant">
          <div>
            <h2 className="font-headline-md text-headline-md font-bold text-on-surface tracking-tight">My Watchlist</h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              {list.length}/{MAX_SYMBOLS} stocks · saved in this browser only
            </p>
          </div>
          <form
            className="flex items-center space-x-2"
            onSubmit={(e) => {
              e.preventDefault();
              submit(input);
            }}
          >
            <div className="relative w-full sm:w-56">
              <Icon name="add" size={16} className="absolute left-2.5 top-2.5 text-outline" />
              <Input
                aria-label="Add stock ticker"
                aria-invalid={message ? true : undefined}
                placeholder="Add ticker (e.g. BBCA)"
                value={input}
                maxLength={9}
                autoCapitalize="characters"
                onChange={(e) => {
                  setInput(e.target.value);
                  setMessage(null);
                }}
              />
            </div>
            <Button type="submit" disabled={!input.trim() || symbols === null}>
              <span className="font-label-caps text-label-caps">ADD</span>
            </Button>
          </form>
        </div>
        {message && (
          <p role="alert" className="mt-2 font-body-sm text-body-sm text-error">
            {message}
          </p>
        )}

        {symbols === null ? (
          <div className="mt-3 space-y-2" aria-busy>
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : list.length === 0 ? (
          <div>
            <EmptyPanel icon="bookmarks" title="Your watchlist is empty" hint="Type an IDX ticker above, or start with one of these:" />
            <div className="flex flex-wrap justify-center gap-2 pb-4">
              {SUGGESTIONS.map((s) => (
                <Button key={s} onClick={() => submit(s)}>
                  <Icon name="add" size={14} />
                  <span className="font-label-caps text-label-caps">{s}</span>
                </Button>
              ))}
            </div>
          </div>
        ) : !stocks.data && stocks.error ? (
          <ErrorPanel message={stocks.error} onRetry={stocks.refresh} />
        ) : (
          <div className="overflow-x-auto mt-2">
            <table className="w-full text-left border-collapse min-w-[760px]" aria-busy={waiting}>
              <thead>
                <tr className="border-b border-outline-variant font-label-caps text-label-caps text-outline">
                  <th scope="col" className="py-2.5 px-3">SYMBOL</th>
                  <th scope="col" className="py-2.5 px-3 text-right">LAST (IDR)</th>
                  <th scope="col" className="py-2.5 px-3 text-right">CHG</th>
                  <th scope="col" className="py-2.5 px-3 text-right">CHG %</th>
                  <th scope="col" className="py-2.5 px-3 text-right">DAY RANGE (LOW - HIGH)</th>
                  <th scope="col" className="py-2.5 px-3 text-right">VOLUME (LOTS)</th>
                  <th scope="col" className="py-2.5 px-3 w-10"><span className="sr-only">Remove</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant font-data-mono-md text-data-mono-md">
                {list.map((sym) => {
                  const q = quoteOf.get(sym);
                  const isSel = sym === selected;
                  const removeBtn = (
                    <Button variant="ghost" size="icon" aria-label={`Remove ${sym}`} title={`Remove ${sym}`} onClick={() => remove(sym)}>
                      <Icon name="close" size={16} />
                    </Button>
                  );
                  if (!q) {
                    const reason = stocks.data?.unavailable.find((u) => u.symbol === sym)?.reason;
                    return (
                      <tr key={sym}>
                        <td className="py-2.5 px-3 font-bold text-on-surface">{sym}</td>
                        {waiting && !reason ? (
                          <td colSpan={5} className="py-2.5 px-3"><Skeleton className="h-5 w-full" /></td>
                        ) : (
                          <td colSpan={5} className="py-2.5 px-3 font-body-sm text-body-sm text-on-surface-variant">
                            Unavailable — {reason ?? "no data returned"}
                          </td>
                        )}
                        <td className="py-1 px-1">{removeBtn}</td>
                      </tr>
                    );
                  }
                  const tone = toneOf(q.change);
                  const d = priceDecimals(q);
                  return (
                    <tr key={sym} className={cn("transition-colors hover:bg-surface-variant/40", isSel && "bg-surface-variant/40")}>
                      <td className="py-2 px-3">
                        <button
                          type="button"
                          onClick={() => setPicked(sym)}
                          aria-pressed={isSel}
                          className="text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container rounded"
                        >
                          <span className={cn("block font-bold", isSel ? "text-primary" : "text-on-surface")}>{sym}</span>
                          <span className="block font-body-sm text-body-sm text-on-surface-variant max-w-[220px] truncate">{q.name ?? "—"}</span>
                        </button>
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-on-surface">{fmtNum(q.last, d)}</td>
                      <td className={cn("py-2 px-3 text-right font-semibold", toneText[tone])}>
                        {q.change > 0 ? "+" : q.change < 0 ? "-" : ""}{fmtNum(Math.abs(q.change), d)}
                      </td>
                      <td className="py-2 px-3 text-right">
                        <span className={cn("inline-block px-1.5 py-0.5 rounded font-semibold", tonePill[tone])}>{fmtPct(q.changePct)}</span>
                      </td>
                      <td className="py-2 px-3 text-right text-on-surface-variant font-data-mono-sm text-data-mono-sm">
                        {fmtNum(q.low, d)} - {fmtNum(q.high, d)}
                      </td>
                      <td className="py-2 px-3 text-right text-on-surface-variant">{fmtLots(q.volumeLots)}</td>
                      <td className="py-1 px-1">{removeBtn}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {list.length > 0 && (
          <p className="mt-3 pt-3 border-t border-outline-variant font-body-sm text-body-sm text-outline">
            Click a symbol to chart it • Satuan Volume: Lot (1 Lot = 100 Lembar) • Informational only, not investment advice
          </p>
        )}
      </section>

      {selected && (
        <PriceChart
          title={selected}
          subtitle={selectedQuote?.name ?? "Saham BEI"}
          endpoint={`GET /api/market/stocks/${selected}/history`}
          decimals={priceDecimals(selectedQuote)}
          range={range}
          onRangeChange={setRange}
          history={hist.data}
          historyLoading={hist.loading}
          historyError={hist.error}
          onRetry={hist.refresh}
          quote={selectedQuote}
          marketStatus={stocks.data?.marketStatus ?? clockStatus}
          fallbackMeta={stocks.data?.meta ?? null}
        />
      )}
    </AppShell>
  );
}
