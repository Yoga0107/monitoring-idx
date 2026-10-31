"use client";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { useClock } from "@/hooks/use-wib-clock";
import { fmtDateId, fmtTimeWib } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { MarketSnapshot } from "@/types/market";

interface Props {
  snapshot: MarketSnapshot | null;
  error: string | null;
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
}

export function TopBar({ snapshot, error, loading, refreshing, onRefresh }: Props) {
  const now = useClock();
  const status = snapshot?.marketStatus;
  const lastUpdate = snapshot?.quotes.reduce<string | null>((max, q) => (!max || q.updatedAt > max ? q.updatedAt : max), null);

  const dot = status?.state === "OPEN" ? "bg-secondary status-pulse" : status?.state === "BREAK" ? "bg-primary-container" : "bg-outline";
  const text = status?.state === "OPEN" ? "text-secondary-fixed" : status?.state === "BREAK" ? "text-primary" : "text-outline";

  const apiLabel = error && !snapshot ? "API: ERROR" : loading ? "API: CONNECTING…" : `API: CONNECTED (${snapshot?.meta.providerLabel ?? "—"})`;

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
          <span className={cn("w-1.5 h-1.5 rounded-full", error && !snapshot ? "bg-error" : "bg-primary-container")} />
          <span className="font-label-caps text-label-caps text-on-surface-variant">{apiLabel}</span>
        </div>
        <div className="hidden md:flex items-center space-x-1.5 text-on-surface-variant">
          <span className="font-label-caps text-label-caps text-outline">LAST UPDATE:</span>
          <span className="font-data-mono-sm text-data-mono-sm text-on-surface font-medium">{lastUpdate ? fmtTimeWib(lastUpdate) : "—"}</span>
        </div>
        <div className="flex items-center space-x-1">
          <Button variant="ghost" size="icon" title="Refresh data" aria-label="Refresh data" onClick={onRefresh} disabled={refreshing}>
            <Icon name="refresh" size={18} className={refreshing ? "animate-spin" : undefined} />
          </Button>
        </div>
      </div>
    </header>
  );
}
