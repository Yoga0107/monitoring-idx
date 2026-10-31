"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { usePolledJson } from "@/hooks/use-polled-json";
import { fmtTimeWib } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { HealthReport, HealthStatus, ProviderHealth } from "@/types/market";
import { ErrorPanel } from "@/components/dashboard/states";

const STYLE: Record<HealthStatus, { text: string; pill: string; icon: string; label: string }> = {
  ok: { text: "text-secondary", pill: "bg-secondary/10 text-secondary", icon: "check_circle", label: "OK" },
  warn: { text: "text-amber-300", pill: "bg-amber-300/10 text-amber-300", icon: "warning", label: "WARNING" },
  fail: { text: "text-error", pill: "bg-error-container/20 text-error", icon: "error", label: "FAILING" },
};

function StatusPill({ status }: { status: HealthStatus }) {
  const s = STYLE[status];
  return (
    <span className={cn("inline-flex items-center space-x-1 px-2 py-0.5 rounded font-label-caps text-label-caps font-semibold", s.pill)}>
      <Icon name={s.icon} size={13} />
      <span>{s.label}</span>
    </span>
  );
}

function ProviderCard({ p }: { p: ProviderHealth }) {
  return (
    <section aria-label={`${p.label} health`} className="bg-surface-container-low border border-outline-variant rounded-lg p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-outline-variant">
        <div className="flex items-center space-x-2">
          <h2 className="font-headline-md text-headline-md font-bold text-on-surface">{p.label}</h2>
          <span className="font-label-caps text-label-caps px-1.5 py-0.5 rounded bg-surface-variant text-outline">{p.dataMode.toUpperCase()}</span>
        </div>
        <div className="flex items-center space-x-3">
          <span className="font-label-caps text-label-caps text-outline">
            NEWEST DATA: <span className="text-on-surface">{p.latestDataAt ? fmtTimeWib(p.latestDataAt) : "—"}</span>
          </span>
          <StatusPill status={p.status} />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[640px]">
          <thead>
            <tr className="font-label-caps text-label-caps text-outline border-b border-outline-variant">
              <th scope="col" className="py-2 px-3">CHECK</th>
              <th scope="col" className="py-2 px-3">STATUS</th>
              <th scope="col" className="py-2 px-3 text-right">TIME</th>
              <th scope="col" className="py-2 px-3">DETAIL</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {p.checks.map((c) => (
              <tr key={c.name} className="align-top">
                <td className="py-2 px-3 font-data-mono-md text-data-mono-md text-on-surface whitespace-nowrap">{c.name}</td>
                <td className="py-2 px-3"><StatusPill status={c.status} /></td>
                <td className="py-2 px-3 text-right font-data-mono-sm text-data-mono-sm text-on-surface-variant whitespace-nowrap">{c.latencyMs === null ? "—" : `${c.latencyMs} ms`}</td>
                <td className="py-2 px-3 font-body-sm text-body-sm text-on-surface-variant break-words">{c.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function HealthView() {
  const { data, error, loading, refreshing, refresh } = usePolledJson<HealthReport>("/api/health", 30_000);
  const overall = data ? STYLE[data.overall.status] : null;

  return (
    <div className="min-h-screen">
      <header className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 bg-surface border-b border-outline-variant sticky top-0 z-30">
        <div className="flex items-center space-x-3">
          <Link href="/" className="flex items-center space-x-1 text-outline hover:text-primary transition-colors" aria-label="Back to dashboard">
            <Icon name="arrow_back" size={18} />
            <span className="font-label-caps text-label-caps">DASHBOARD</span>
          </Link>
          <span className="text-outline">/</span>
          <h1 className="font-headline-md text-headline-md font-bold text-on-surface">API Health</h1>
        </div>
        <div className="flex items-center space-x-3">
          {data && <span className="font-label-caps text-label-caps text-outline">CHECKED: <span className="text-on-surface">{fmtTimeWib(data.checkedAt)}</span></span>}
          <Button onClick={refresh} disabled={refreshing} className="space-x-1">
            <Icon name="refresh" size={16} className={refreshing ? "animate-spin" : undefined} />
            <span className="font-label-caps text-label-caps">RUN AGAIN</span>
          </Button>
        </div>
      </header>

      <main className="p-4 sm:p-6 space-y-6 max-w-5xl mx-auto">
        {loading && !data ? (
          <div className="space-y-4" aria-busy>
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : !data ? (
          <div className="bg-surface-container-low border border-outline-variant rounded-lg">
            <ErrorPanel message={error ?? "The health endpoint did not respond."} onRetry={refresh} />
          </div>
        ) : (
          <>
            <section
              aria-live="polite"
              className={cn("rounded-lg border p-4 flex flex-wrap items-center gap-4", data.overall.status === "ok" ? "border-secondary/40" : data.overall.status === "warn" ? "border-amber-300/40" : "border-error/50", "bg-surface-container-low")}
            >
              <Icon name={overall?.icon ?? "help"} size={32} className={overall?.text} />
              <div className="flex-1 min-w-[240px]">
                <p className={cn("font-headline-md text-headline-md font-bold", overall?.text)}>{overall?.label}</p>
                <p className="font-body-md text-body-md text-on-surface-variant">{data.overall.message}</p>
              </div>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-1">
                <dt className="font-label-caps text-label-caps text-outline">MARKET</dt>
                <dd className="font-data-mono-sm text-data-mono-sm text-on-surface">{data.marketStatus.state} · {data.marketStatus.session}</dd>
              </dl>
            </section>

            {error && <p role="status" className="font-body-sm text-body-sm text-error">Last re-check failed ({error}); showing the previous result.</p>}

            {data.providers.map((p) => <ProviderCard key={p.id} p={p} />)}

            <section className="bg-surface-container-low border border-outline-variant rounded-lg p-4 space-y-3">
              <h2 className="font-headline-md text-headline-md font-bold text-on-surface">Configuration</h2>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                {data.config.yahooSymbols.map((s) => (
                  <div key={s.code} className="flex justify-between border-b border-outline-variant py-1">
                    <dt className="font-data-mono-sm text-data-mono-sm text-on-surface-variant">Yahoo symbol · {s.code}</dt>
                    <dd className={cn("font-data-mono-sm text-data-mono-sm", s.symbol ? "text-on-surface" : "text-outline")}>{s.symbol ?? "not set"}</dd>
                  </div>
                ))}
                <div className="flex justify-between border-b border-outline-variant py-1">
                  <dt className="font-data-mono-sm text-data-mono-sm text-on-surface-variant">Node.js</dt>
                  <dd className="font-data-mono-sm text-data-mono-sm text-on-surface">{data.config.nodeVersion}</dd>
                </div>
                <div className="flex justify-between border-b border-outline-variant py-1">
                  <dt className="font-data-mono-sm text-data-mono-sm text-on-surface-variant">Vercel region</dt>
                  <dd className="font-data-mono-sm text-data-mono-sm text-on-surface">{data.config.vercelRegion ?? "not on Vercel"}</dd>
                </div>
              </dl>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                <strong className="text-on-surface">Reading LAST UPDATE:</strong> on the dashboard it is the time of the newest trade the data source reports, not when the page refreshed. It stays put when the exchange is closed or on break, and a delayed feed trails real time. <strong className="text-on-surface">FETCHED</strong> shows when the server last pulled from the source.
              </p>
              <p className="font-body-sm text-body-sm text-outline">
                This page calls the providers live (results cached for 15 s). Raw JSON: <Link href="/api/health" className="text-primary underline">/api/health</Link>
              </p>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
