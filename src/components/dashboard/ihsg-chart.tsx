"use client";

import { useMemo } from "react";
import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { fmtChartTick, fmtChartTooltip, fmtLots, fmtNum, fmtPct, fmtSigned, fmtTimeWib, toneHex, toneOf, toneText } from "@/lib/format";
import { cn } from "@/lib/utils";
import { TIME_RANGES, type HistoryPoint, type IndexHistory, type IndexQuote, type MarketSnapshot, type TimeRange } from "@/types/market";
import { EmptyPanel, ErrorPanel } from "./states";

const MODE_BADGE = { mock: "MOCK", realtime: "REAL-TIME", delayed: "DELAYED", "end-of-day": "END-OF-DAY" } as const;

interface Props {
  range: TimeRange;
  onRangeChange: (r: TimeRange) => void;
  history: IndexHistory | null;
  historyLoading: boolean;
  historyError: string | null;
  onRetry: () => void;
  quote: IndexQuote | null;
  snapshot: MarketSnapshot | null;
}

interface TooltipInput {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: unknown }>;
  range: TimeRange;
  reference: number | null;
}

function ChartTooltip({ active, payload, range, reference }: TooltipInput) {
  const p = payload?.[0]?.payload as HistoryPoint | undefined;
  if (!active || !p) return null;
  const pct = reference ? ((p.close - reference) / reference) * 100 : null;
  return (
    <div className="bg-surface-container-high/95 backdrop-blur border border-primary-container px-3 py-1.5 rounded shadow-lg pointer-events-none">
      <div className="flex items-center space-x-2">
        <span className="w-1.5 h-1.5 rounded-full bg-primary-container" />
        <span className="font-label-caps text-label-caps text-primary">{fmtChartTooltip(p.t, range)}</span>
      </div>
      <div className="mt-0.5 flex items-baseline space-x-2">
        <span className="font-data-mono-md text-data-mono-md font-bold text-on-surface">{fmtNum(p.close)}</span>
        {pct !== null && <span className={cn("font-data-mono-sm text-data-mono-sm font-semibold", toneText[toneOf(pct)])}>{fmtPct(pct)}</span>}
      </div>
    </div>
  );
}

export function IhsgChart({ range, onRangeChange, history, historyLoading, historyError, onRetry, quote, snapshot }: Props) {
  const points = useMemo(() => history?.points ?? [], [history]);
  const reference = range === "1D" ? (history?.prevClose ?? quote?.prevClose ?? null) : (points[0]?.close ?? null);

  // Header figures: intraday = quote; other ranges = change over the selected period.
  const first = points[0]?.close;
  const lastPt = points[points.length - 1]?.close;
  const periodChange = first !== undefined && lastPt !== undefined ? lastPt - first : null;
  const showQuote = range === "1D" && quote;
  const headValue = showQuote ? quote.last : lastPt ?? quote?.last ?? null;
  const headChange = showQuote ? quote.change : periodChange;
  const headPct = showQuote ? quote.changePct : periodChange !== null && first ? (periodChange / first) * 100 : null;
  const tone = toneOf(headChange ?? 0);
  const color = toneHex[tone === "flat" ? "up" : tone];

  const yDomain = useMemo<[number, number] | undefined>(() => {
    if (points.length < 2) return undefined;
    const vals = points.map((p) => p.close);
    if (reference !== null && range === "1D") vals.push(reference);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const pad = (max - min || max * 0.002) * 0.15;
    return [min - pad, max + pad];
  }, [points, reference, range]);

  const meta = history?.meta ?? snapshot?.meta;
  const subtitle =
    range !== "1D" ? `${range} HISTORICAL` : snapshot?.marketStatus.state === "CLOSED" ? "LATEST SESSION" : `${snapshot?.marketStatus.session ?? ""} INTRA-DAY`.trim();

  return (
    <section aria-label="IHSG Chart Panel" className="bg-surface-container-low border border-outline-variant rounded-lg p-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-outline-variant">
        <div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h2 className="font-headline-lg text-headline-lg font-bold text-on-surface tracking-tight">IHSG</h2>
            <span className="text-outline font-body-sm text-body-sm">— Indeks Harga Saham Gabungan</span>
            {meta && <span className="font-label-caps text-label-caps px-2 py-0.5 rounded bg-surface-variant text-primary">{MODE_BADGE[meta.dataMode]}</span>}
          </div>
          <div className="flex flex-wrap items-center gap-x-3 mt-1 min-h-7">
            {headValue === null ? (
              <Skeleton className="h-6 w-48" />
            ) : (
              <>
                <span className="font-data-mono-xl text-data-mono-xl font-bold text-on-surface">{fmtNum(headValue)}</span>
                {headChange !== null && headPct !== null && (
                  <span className={cn("font-data-mono-md text-data-mono-md font-semibold", toneText[tone])}>
                    {fmtSigned(headChange)} ({fmtPct(headPct)})
                  </span>
                )}
                <span className="font-label-caps text-label-caps text-outline">{subtitle}</span>
              </>
            )}
          </div>
        </div>

        <div role="group" aria-label="Timeframe" className="flex items-center space-x-1 p-1 bg-surface-container rounded border border-outline-variant self-start md:self-center">
          {TIME_RANGES.map((r) => (
            <Button key={r} size="none" variant={r === range ? "tabActive" : "tab"} aria-pressed={r === range} onClick={() => onRangeChange(r)}>
              {r}
            </Button>
          ))}
        </div>
      </div>

      <dl className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 py-3 border-b border-outline-variant text-on-surface">
        {[
          { l: "OPEN", v: quote?.open != null ? fmtNum(quote.open) : "—", c: "" },
          { l: "HIGH", v: quote ? fmtNum(quote.high) : "—", c: "text-secondary font-semibold" },
          { l: "LOW", v: quote ? fmtNum(quote.low) : "—", c: "text-error font-semibold" },
          { l: "PREV CLOSE", v: quote ? fmtNum(quote.prevClose) : "—", c: "text-outline" },
          { l: "VOLUME (LOTS)", v: fmtLots(quote?.volumeLots ?? null), c: "" },
          { l: "LAST UPDATE", v: quote ? fmtTimeWib(quote.updatedAt) : "—", c: "text-primary" },
        ].map((s) => (
          <div key={s.l} className="space-y-0.5">
            <dt className="font-label-caps text-label-caps text-outline">{s.l}</dt>
            <dd className={cn("font-data-mono-md text-data-mono-md font-medium", s.c)}>{s.v}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-4 relative bg-surface-container rounded border border-outline-variant p-2 overflow-hidden">
        {range === "1D" && reference !== null && points.length > 1 && (
          <div className="absolute right-14 top-4 z-10 hidden sm:flex items-center space-x-2 bg-surface-container-high/80 px-2 py-1 rounded border border-outline-variant">
            <span className="w-3 h-0.5 border-t border-dashed border-outline inline-block" />
            <span className="font-label-caps text-label-caps text-outline">Prev Close: {fmtNum(reference)}</span>
          </div>
        )}
        <div className="w-full h-72" aria-busy={historyLoading}>
          {historyLoading ? (
            <Skeleton className="h-full w-full" />
          ) : historyError && !history ? (
            <ErrorPanel message={historyError} onRetry={onRetry} className="h-full" />
          ) : points.length < 2 ? (
            <EmptyPanel icon="show_chart" title="No chart data for this period" hint="The provider returned too few points. Try another timeframe." className="h-full" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={points} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="chartGradient" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={0.28} />
                    <stop offset="85%" stopColor={color} stopOpacity={0.02} />
                    <stop offset="100%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#31353e" strokeDasharray="4 4" vertical={false} />
                <XAxis
                  dataKey="t"
                  type="number"
                  scale="time"
                  domain={["dataMin", "dataMax"]}
                  tickCount={6}
                  tickFormatter={(v: number) => fmtChartTick(v, range)}
                  tick={{ fill: "#87929a", fontSize: 10, fontFamily: "var(--font-mono), monospace" }}
                  axisLine={false}
                  tickLine={false}
                  minTickGap={32}
                />
                <YAxis orientation="right" width={52} domain={yDomain ?? ["auto", "auto"]} tickCount={5} tickFormatter={(v: number) => fmtNum(v)} tick={{ fill: "#87929a", fontSize: 10, fontFamily: "var(--font-mono), monospace" }} axisLine={false} tickLine={false} />
                {range === "1D" && reference !== null && <ReferenceLine y={reference} stroke="#87929a" strokeDasharray="3 3" strokeWidth={1.2} />}
                <Tooltip
                  cursor={{ stroke: "#38bdf8", strokeDasharray: "2 2", strokeWidth: 1.2 }}
                  content={(p) => <ChartTooltip active={p.active} payload={p.payload} range={range} reference={reference} />}
                />
                <Area type="monotone" dataKey="close" stroke={color} strokeWidth={2.5} fill="url(#chartGradient)" isAnimationActive={false} activeDot={{ r: 5, fill: "#38bdf8", stroke: "rgba(56,189,248,0.3)", strokeWidth: 6 }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-outline">
        <span className="font-label-caps text-label-caps text-on-surface-variant">
          GET /api/market/history · {meta ? `${meta.providerLabel}${meta.cached ? " · cached" : ""}` : "—"}
        </span>
        <div className="flex items-center space-x-3 font-label-caps text-label-caps">
          <span>LATENCY: <span className="text-secondary font-medium">{meta ? `${meta.latencyMs}ms` : "—"}</span></span>
          <span>•</span>
          <span>PROTOCOL: <span className="text-on-surface font-medium">REST</span></span>
        </div>
      </div>
    </section>
  );
}
