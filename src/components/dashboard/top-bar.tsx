"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { useClock } from "@/hooks/use-wib-clock";
import { fmtDateId, fmtTimeWib } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { DataMeta, MarketStatus } from "@/types/market";

interface Props {
  status: MarketStatus | null;
  meta: DataMeta | null;
  /** Newest trade time reported by the source. */
  lastUpdate: string | null;
  error: string | null;
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
}

export function TopBar({ status, meta, lastUpdate, error, loading, refreshing, onRefresh }: Props) {
  const now = useClock();

  const dot = status?.state === "OPEN" ? "bg-secondary status-pulse" : status?.state === "BREAK" ? "bg-primary-container" : "bg-outline";
  const text = status?.state === "OPEN" ? "text-secondary-fixed" : status?.state === "BREAK" ? "text-primary" : "text-outline";

  const apiLabel =
    error && !meta
      ? "API: ERROR"
      : error
        ? "API: REFRESH FAILING — STALE DATA"
        : loading
          ? "API: CONNECTING…"
          : meta
            ? `API: CONNECTED (${meta.providerLabel})`
            : "API: IDLE";
  const apiDot = error ? "bg-error" : meta ? "bg-primary-container" : "bg-outline";

  return (
    <header className="flex justify-between items-center w-full px-6 py-3 bg-surface border-b border-outline-variant sticky top-0 z-30">
      <div className="flex items-center space-x-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="font-headline-md text-headline-md font-bold text-on-surface tracking-tight">Market Insight</h1>
            <span className="text-outline hidden sm:inline">/</span>
            <span className="font-body-sm text-body-sm text-on-surface-variant hidden sm:inline">Indonesian Stock Market (IDX)</span>
          </div>
          <div className="flex items-center space-x-2 mt-0.5 min-h-4">
            <span className="font-data-mono-sm text-data-mono-sm text-outline">{now ? fmtDateId(now) : "\u00A0"}</span>
            <span className="text-outline text-xs">•</span>
            <span className="font-data-mono-sm text-data-mono-sm text-on-surface font-semibold">{now ? fmtTimeWib(now) : "--:--:-- WIB"}</span>
          </div>
        </div>
        <div className="h-6 w-px bg-outline-variant hidden sm:block" />
        <div className="hidden sm:flex items-center space-x-2 px-2.5 py-1 rounded-full bg-surface-container border border-outline-variant">
          <span className={cn("w-2 h-2 rounded-full", dot)} />
          <span className={cn("font-data-mono-sm text-data-mono-sm font-semibold", text)}>{status?.label ?? "IDX: —"}</span>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <div className="hidden lg:flex items-center space-x-2 px-2 py-0.5 rounded border border-outline-variant bg-surface-container-low">
          <span className={cn("w-1.5 h-1.5 rounded-full", apiDot)} />
          <span className="font-label-caps text-label-caps text-on-surface-variant">{apiLabel}</span>
        </div>
        <div className="hidden md:flex items-center space-x-1.5 text-on-surface-variant" title="Time of the newest trade reported by the data source. It does not advance while the market is closed or on break.">
          <span className="font-label-caps text-label-caps text-outline">LAST UPDATE:</span>
          <span className="font-data-mono-sm text-data-mono-sm text-on-surface font-medium">{lastUpdate ? fmtTimeWib(lastUpdate) : "—"}</span>
        </div>
        <div className="hidden xl:flex items-center space-x-1.5 text-on-surface-variant" title="When the server last pulled data from the source (cached for up to 15 s while trading).">
          <span className="font-label-caps text-label-caps text-outline">FETCHED:</span>
          <span className="font-data-mono-sm text-data-mono-sm text-on-surface font-medium">{meta ? fmtTimeWib(meta.fetchedAt) : "—"}</span>
        </div>
        <div className="flex items-center space-x-1">
          <Link href="/health" title="API health check" aria-label="API health check" className="w-8 h-8 rounded-lg flex items-center justify-center text-outline hover:text-primary hover:bg-surface-variant transition-colors">
            <Icon name="monitor_heart" size={18} />
          </Link>
          <Button variant="ghost" size="icon" title="Refresh data" aria-label="Refresh data" onClick={onRefresh} disabled={refreshing}>
            <Icon name="refresh" size={18} className={refreshing ? "animate-spin" : undefined} />
          </Button>
        </div>
      </div>
    </header>
  );
}
