"use client";

import { useState } from "react";
import { usePolledJson } from "@/hooks/use-polled-json";
import { useSource } from "@/hooks/use-source";
import type { IndexHistory, MarketSnapshot, TimeRange } from "@/types/market";
import { DataBanner } from "./data-banner";
import { Footer } from "./footer";
import { IhsgChart } from "./ihsg-chart";
import { IndicesTable } from "./indices-table";
import { Sidebar } from "./sidebar";
import { SummaryCards } from "./summary-cards";
import { TopBar } from "./top-bar";

const SNAPSHOT_POLL_MS = 30_000;
const HISTORY_POLL_MS = 60_000;

export function Dashboard() {
  const [range, setRange] = useState<TimeRange>("1D");
  const { source, setSource } = useSource();
  const sourceParam = source ? `&source=${source}` : "";
  const snap = usePolledJson<MarketSnapshot>(`/api/market/indices${source ? `?source=${source}` : ""}`, SNAPSHOT_POLL_MS);
  const hist = usePolledJson<IndexHistory>(`/api/market/history?code=IHSG&range=${range}${sourceParam}`, range === "1D" ? HISTORY_POLL_MS : 0);

  const ihsg = snap.data?.quotes.find((q) => q.code === "IHSG") ?? null;
  const refreshAll = () => {
    snap.refresh();
    hist.refresh();
  };

  return (
    <>
      <Sidebar online={!snap.error || !!snap.data} />
      <div className="pl-16 flex-1 flex flex-col min-w-0">
        <TopBar snapshot={snap.data} error={snap.error} loading={snap.loading} refreshing={snap.refreshing || hist.refreshing} onRefresh={refreshAll} />
        <DataBanner snapshot={snap.data} error={snap.error} source={source} onSourceChange={setSource} />
        {snap.error && snap.data && (
          <div role="status" className="px-6 py-1.5 bg-error-container/20 border-b border-outline-variant text-error font-body-sm text-body-sm">
            Refresh failed — showing the last successful data. {snap.error}
          </div>
        )}
        <main className="flex-1 p-4 sm:p-6 space-y-6">
          <SummaryCards snapshot={snap.data} loading={snap.loading} error={snap.error} onRetry={snap.refresh} />
          <IhsgChart
            range={range}
            onRangeChange={setRange}
            history={hist.data}
            historyLoading={hist.loading}
            historyError={hist.error}
            onRetry={hist.refresh}
            quote={ihsg}
            snapshot={snap.data}
          />
          <IndicesTable snapshot={snap.data} loading={snap.loading} error={snap.error} onRetry={snap.refresh} />
        </main>
        <Footer snapshot={snap.data} />
      </div>
    </>
  );
}
