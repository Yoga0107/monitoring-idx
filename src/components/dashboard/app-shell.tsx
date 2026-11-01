"use client";

import type { DataMeta, MarketStatus } from "@/types/market";
import { DataBanner } from "./data-banner";
import { Footer } from "./footer";
import { Sidebar } from "./sidebar";
import { TopBar } from "./top-bar";

interface Props {
  status: MarketStatus | null;
  meta: DataMeta | null;
  lastUpdate: string | null;
  error: string | null;
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  /** True when we hold data already (a failed refresh then shows a "stale" strip instead of an error page). */
  hasData: boolean;
  children: React.ReactNode;
}

/** Sidebar + header + data banner + footer shared by every page. */
export function AppShell({ status, meta, lastUpdate, error, loading, refreshing, onRefresh, hasData, children }: Props) {
  return (
    <>
      <Sidebar online={!error || hasData} />
      <div className="pl-16 flex-1 flex flex-col min-w-0 overflow-x-clip">
        <TopBar status={status} meta={meta} lastUpdate={lastUpdate} error={error} loading={loading} refreshing={refreshing} onRefresh={onRefresh} />
        <DataBanner meta={meta} error={error} loading={loading} />
        {error && hasData && (
          <div role="status" className="px-3 sm:px-6 py-1.5 bg-error-container/20 border-b border-outline-variant text-error font-body-sm text-body-sm">
            Refresh failed — showing the last successful data. {error}
          </div>
        )}
        <main className="flex-1 min-w-0 p-3 sm:p-6 space-y-4 sm:space-y-6">{children}</main>
        <Footer session={status?.session ?? null} />
      </div>
    </>
  );
}
