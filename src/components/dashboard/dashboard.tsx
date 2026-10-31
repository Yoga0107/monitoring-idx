"use client";

import { useState } from "react";
import { usePolledJson } from "@/hooks/use-polled-json";
import type { IndexHistory, MarketSnapshot, TimeRange } from "@/types/market";
import { AppShell } from "./app-shell";
import { IhsgChart } from "./ihsg-chart";
import { IndicesTable } from "./indices-table";
import { SummaryCards } from "./summary-cards";

// Poll as often as the server-side cache (15 s while trading) can usefully serve.
const SNAPSHOT_POLL_MS = 15_000;
const HISTORY_POLL_MS = 30_000;

export function Dashboard() {
  const [range, setRange] = useState<TimeRange>("1D");
  const snap = usePolledJson<MarketSnapshot>("/api/market/indices", SNAPSHOT_POLL_MS);
  const hist = usePolledJson<IndexHistory>(`/api/market/history?code=IHSG&range=${range}`, range === "1D" ? HISTORY_POLL_MS : 0);

  const ihsg = snap.data?.quotes.find((q) => q.code === "IHSG") ?? null;
  const lastUpdate = snap.data?.quotes.reduce<string | null>((max, q) => (!max || q.updatedAt > max ? q.updatedAt : max), null) ?? null;

  return (
    <AppShell
      status={snap.data?.marketStatus ?? null}
      meta={snap.data?.meta ?? null}
      lastUpdate={lastUpdate}
      error={snap.error}
      loading={snap.loading}
      refreshing={snap.refreshing || hist.refreshing}
      onRefresh={() => {
        snap.refresh();
        hist.refresh();
      }}
      hasData={!!snap.data}
    >
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
    </AppShell>
  );
}
