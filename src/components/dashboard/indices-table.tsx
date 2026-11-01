"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { fmtLots, fmtNum, fmtPct, fmtSigned, toneOf, tonePill, toneText, type Tone } from "@/lib/format";
import { cn } from "@/lib/utils";
import { INDICES } from "@/services/market-data/indices";
import type { IndexQuote, MarketSnapshot } from "@/types/market";
import { EmptyPanel, ErrorPanel } from "./states";

type Filter = "ALL" | "UP" | "DOWN";
const NEXT: Record<Filter, Filter> = { ALL: "UP", UP: "DOWN", DOWN: "ALL" };
const DOT: Record<Tone, string> = { up: "bg-secondary", down: "bg-error", flat: "bg-outline" };

function statusLabel(q: IndexQuote, state: MarketSnapshot["marketStatus"]["state"]): string {
  if (state === "CLOSED") return "Closed";
  if (state === "BREAK") return "On Break";
  if (Math.abs(q.changePct) >= 0.5) return q.changePct > 0 ? "Positive Momentum" : "Negative Momentum";
  return "Active Trading";
}

interface Props {
  snapshot: MarketSnapshot | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

export function IndicesTable({ snapshot, loading, error, onRetry }: Props) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("ALL");

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return INDICES.map((def) => ({
      def,
      quote: snapshot?.quotes.find((x) => x.code === def.code) ?? null,
      reason: snapshot?.unavailable.find((u) => u.code === def.code)?.reason ?? "No data",
    })).filter(({ def, quote }) => {
      if (q && !`${def.code} ${def.description}`.toLowerCase().includes(q)) return false;
      if (filter === "UP") return !!quote && quote.change > 0;
      if (filter === "DOWN") return !!quote && quote.change < 0;
      return true;
    });
  }, [snapshot, query, filter]);

  const state = snapshot?.marketStatus.state ?? "CLOSED";

  return (
    <section aria-label="Stock Indices Matrix" className="bg-surface-container-low border border-outline-variant rounded-lg p-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-outline-variant">
        <div>
          <h3 className="font-headline-md text-headline-md font-bold text-on-surface tracking-tight">Indonesian Stock Indices Matrix</h3>
          <p className="font-body-sm text-body-sm text-on-surface-variant">Benchmark tracking for major Indonesia Stock Exchange index baskets</p>
        </div>
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <div className="relative min-w-0 flex-1 sm:flex-none sm:w-64">
            <Icon name="search" size={16} className="absolute left-2.5 top-2.5 text-outline" />
            <Input aria-label="Filter indices" placeholder="Filter index (e.g. LQ45)..." value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <Button onClick={() => setFilter(NEXT[filter])} aria-label={`Direction filter: ${filter}`} title="Cycle: all / gainers / decliners" className="shrink-0 space-x-1">
            <Icon name="filter_list" size={16} />
            <span className="font-label-caps text-label-caps w-9 text-left">{filter}</span>
          </Button>
        </div>
      </div>

      {!snapshot && error ? (
        <ErrorPanel message={error} onRetry={onRetry} />
      ) : (
        <div className="overflow-x-auto mt-2">
          <table className="hidden md:table w-full text-left border-collapse min-w-[860px]" aria-busy={loading}>
            <thead>
              <tr className="border-b border-outline-variant font-label-caps text-label-caps text-outline">
                <th scope="col" className="py-2.5 px-3">INDEX CODE</th>
                <th scope="col" className="py-2.5 px-3">DESCRIPTION</th>
                <th scope="col" className="py-2.5 px-3 text-right">LAST VALUE</th>
                <th scope="col" className="py-2.5 px-3 text-right">POINT CHG</th>
                <th scope="col" className="py-2.5 px-3 text-right">CHG %</th>
                <th scope="col" className="py-2.5 px-3 text-right">DAY RANGE (LOW - HIGH)</th>
                <th scope="col" className="py-2.5 px-3 text-right">VOLUME (LOTS)</th>
                <th scope="col" className="py-2.5 px-3 text-center">MOMENTUM / STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant font-data-mono-md text-data-mono-md">
              {loading && !snapshot
                ? INDICES.map((i) => (
                    <tr key={i.code}>
                      <td colSpan={8} className="py-2.5 px-3"><Skeleton className="h-5 w-full" /></td>
                    </tr>
                  ))
                : rows.map(({ def, quote, reason }) => {
                    if (!quote) {
                      return (
                        <tr key={def.code}>
                          <td className="py-2.5 px-3 font-bold text-on-surface"><div className="flex items-center space-x-2"><span className="w-1.5 h-1.5 rounded-full bg-outline" /><span>{def.code}</span></div></td>
                          <td colSpan={7} className="py-2.5 px-3 font-body-sm text-body-sm text-on-surface-variant">Unavailable — {reason}</td>
                        </tr>
                      );
                    }
                    const tone = toneOf(quote.change);
                    return (
                      <tr key={def.code} className="hover:bg-surface-variant/40 transition-colors">
                        <td className="py-2.5 px-3 font-bold text-on-surface">
                          <div className="flex items-center space-x-2"><span className={cn("w-1.5 h-1.5 rounded-full", DOT[tone])} /><span>{quote.code}</span></div>
                        </td>
                        <td className="py-2.5 px-3 font-body-sm text-body-sm text-on-surface-variant">{quote.description}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-on-surface">{fmtNum(quote.last)}</td>
                        <td className={cn("py-2.5 px-3 text-right font-semibold", toneText[tone])}>{fmtSigned(quote.change)}</td>
                        <td className={cn("py-2.5 px-3 text-right font-semibold", toneText[tone])}>{fmtPct(quote.changePct)}</td>
                        <td className="py-2.5 px-3 text-right text-on-surface-variant font-data-mono-sm text-data-mono-sm">{fmtNum(quote.low)} - {fmtNum(quote.high)}</td>
                        <td className="py-2.5 px-3 text-right text-on-surface-variant">{fmtLots(quote.volumeLots)}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={cn("inline-block px-2 py-0.5 rounded font-label-caps text-label-caps font-semibold", state === "OPEN" ? tonePill[tone] : tonePill.flat)}>
                            {statusLabel(quote, state)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
            </tbody>
          </table>
          <ul className="md:hidden space-y-2" aria-label="Indices" aria-busy={loading}>
            {loading && !snapshot
              ? INDICES.map((i) => <li key={i.code}><Skeleton className="h-24 w-full" /></li>)
              : rows.map(({ def, quote, reason }) => {
                  if (!quote) {
                    return (
                      <li key={def.code} className="rounded border border-outline-variant bg-surface-container p-3">
                        <span className="font-bold text-on-surface font-data-mono-md text-data-mono-md">{def.code}</span>
                        <p className="font-body-sm text-body-sm text-on-surface-variant">Unavailable — {reason}</p>
                      </li>
                    );
                  }
                  const tone = toneOf(quote.change);
                  return (
                    <li key={def.code} className="rounded border border-outline-variant bg-surface-container p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center space-x-2 min-w-0">
                          <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", DOT[tone])} />
                          <span className="font-bold text-on-surface font-data-mono-md text-data-mono-md">{quote.code}</span>
                          <span className="truncate font-body-sm text-body-sm text-on-surface-variant">{quote.description}</span>
                        </div>
                        <span className={cn("shrink-0 px-1.5 py-0.5 rounded font-data-mono-sm text-data-mono-sm font-semibold", tonePill[tone])}>{fmtPct(quote.changePct)}</span>
                      </div>
                      <div className="mt-1.5 flex items-baseline justify-between">
                        <span className="font-data-mono-xl text-data-mono-xl font-bold text-on-surface">{fmtNum(quote.last)}</span>
                        <span className={cn("font-data-mono-sm text-data-mono-sm font-semibold", toneText[tone])}>{fmtSigned(quote.change)}</span>
                      </div>
                      <dl className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-0.5 font-label-caps text-label-caps text-outline">
                        <dt>DAY RANGE</dt>
                        <dd className="text-right text-on-surface-variant">{fmtNum(quote.low)} - {fmtNum(quote.high)}</dd>
                        <dt>VOLUME (LOTS)</dt>
                        <dd className="text-right text-on-surface-variant">{fmtLots(quote.volumeLots)}</dd>
                        <dt>STATUS</dt>
                        <dd className="text-right text-on-surface-variant">{statusLabel(quote, state)}</dd>
                      </dl>
                    </li>
                  );
                })}
          </ul>
          {snapshot && rows.length === 0 && (
            <EmptyPanel icon="search_off" title="No indices match your filter" hint="Clear the search box or switch the direction filter back to ALL." />
          )}
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-outline-variant flex flex-col sm:flex-row items-center justify-between text-outline text-xs gap-2">
        <span className="font-body-sm text-body-sm">
          Menampilkan {rows.length} dari {INDICES.length} indeks • Satuan Volume: Lot (1 Lot = 100 Lembar)
        </span>
        <div className="flex items-center space-x-4 font-label-caps text-label-caps">
          <span className="flex items-center space-x-1"><span className="w-2 h-2 rounded-full bg-secondary" /><span>Positive Session</span></span>
          <span className="flex items-center space-x-1"><span className="w-2 h-2 rounded-full bg-error" /><span>Negative Session</span></span>
        </div>
      </div>
    </section>
  );
}
