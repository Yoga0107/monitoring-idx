"use client";

import { useEffect, useRef, useState } from "react";
import { ErrorPanel } from "@/components/dashboard/states";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { usePolledJson } from "@/hooks/use-polled-json";
import { fmtMetric, fmtTimeWib } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AnalysisPoint, AnalysisResponse, FundamentalsResponse, MetricGroup, Outlook } from "@/types/fundamentals";

const GROUPS: { id: MetricGroup; title: string }[] = [
  { id: "valuation", title: "Valuasi" },
  { id: "profitability", title: "Profitabilitas" },
  { id: "growth", title: "Pertumbuhan & skala" },
  { id: "health", title: "Kesehatan keuangan" },
  { id: "market", title: "Posisi pasar" },
];

const OUTLOOK: Record<Outlook, { label: string; cls: string }> = {
  positif: { label: "FUNDAMENTAL POSITIF", cls: "bg-secondary/10 text-secondary" },
  netral: { label: "FUNDAMENTAL NETRAL", cls: "bg-primary-container/10 text-primary" },
  negatif: { label: "FUNDAMENTAL NEGATIF", cls: "bg-error-container/20 text-error" },
  data_tidak_cukup: { label: "DATA TIDAK CUKUP", cls: "bg-surface-variant text-outline" },
};

type Ai =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; data: AnalysisResponse }
  | { status: "error"; message: string };

function PointList({ title, icon, tone, items }: { title: string; icon: string; tone: string; items: AnalysisPoint[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <h4 className={cn("flex items-center space-x-1 font-label-caps text-label-caps mb-1.5", tone)}>
        <Icon name={icon} size={14} />
        <span>{title}</span>
      </h4>
      <ul className="space-y-2">
        {items.map((p, i) => (
          <li key={i} className="font-body-md text-body-md text-on-surface">
            {p.point}
            {p.evidence && <span className="block font-data-mono-sm text-data-mono-sm text-outline">{p.evidence}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function FundamentalsPanel({ symbol }: { symbol: string }) {
  const fund = usePolledJson<FundamentalsResponse>(`/api/fundamentals/${symbol}`, 0);
  const [ai, setAi] = useState<Ai>({ status: "idle" });
  const abort = useRef<AbortController | null>(null);
  useEffect(() => () => abort.current?.abort(), []);

  async function runAnalysis() {
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    setAi({ status: "loading" });
    try {
      const res = await fetch(`/api/analysis/${symbol}`, { method: "POST", signal: controller.signal });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error?.message ?? `Request failed (${res.status})`);
      setAi({ status: "done", data: json as AnalysisResponse });
    } catch (e) {
      if (controller.signal.aborted) return;
      setAi({ status: "error", message: e instanceof Error ? e.message : "Request failed" });
    }
  }

  const report = fund.data?.report;

  return (
    <section aria-label={`Analisis fundamental ${symbol}`} className="bg-surface-container-low border border-outline-variant rounded-lg p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-outline-variant">
        <div>
          <h2 className="font-headline-md text-headline-md font-bold text-on-surface tracking-tight">Analisis Fundamental — {symbol}</h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            {report ? [report.name, report.sector, report.industry].filter(Boolean).join(" · ") || "Saham BEI" : "Memuat data…"}
          </p>
        </div>
        {report && (
          <div className="text-right font-label-caps text-label-caps text-outline">
            <div>DATA: {fund.data?.meta.providerLabel}</div>
            <div>DIAMBIL {fmtTimeWib(report.asOf, false)} · {report.coverage.available}/{report.coverage.total} METRIK TERSEDIA</div>
          </div>
        )}
      </div>

      {fund.loading ? (
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3" aria-busy>
          {Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-12" />)}
        </div>
      ) : !report ? (
        <ErrorPanel message={fund.error ?? "Data fundamental tidak tersedia."} onRetry={fund.refresh} />
      ) : (
        <>
          <div className="mt-3 space-y-4">
            {GROUPS.map((g) => {
              const items = report.metrics.filter((m) => m.group === g.id);
              return (
                <div key={g.id}>
                  <h3 className="font-label-caps text-label-caps text-outline mb-1.5">{g.title.toUpperCase()}</h3>
                  <dl className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-2">
                    {items.map((m) => (
                      <div key={m.key} title={m.note}>
                        <dt className="font-body-sm text-body-sm text-on-surface-variant">{m.label}</dt>
                        <dd className={cn("font-data-mono-md text-data-mono-md", m.value === null ? "text-outline" : "text-on-surface")}>
                          {fmtMetric(m.value, m.format, report.currency)}
                          {m.note && m.value !== null && <Icon name="info" size={12} className="ml-1 text-outline" />}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              );
            })}
          </div>

          <ul className="mt-4 space-y-1 border-t border-outline-variant pt-3">
            {report.caveats.map((c, i) => (
              <li key={i} className="flex items-start gap-1.5 font-body-sm text-body-sm text-on-surface-variant">
                <Icon name="info" size={14} className="mt-0.5 text-outline" />
                <span>{c}</span>
              </li>
            ))}
          </ul>

          <div className="mt-4 border-t border-outline-variant pt-3" aria-live="polite">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="flex items-center space-x-1.5 font-headline-md text-headline-md font-semibold text-on-surface">
                <Icon name="auto_awesome" size={18} className="text-primary" />
                <span>Ringkasan AI</span>
              </h3>
              <Button onClick={runAnalysis} disabled={ai.status === "loading" || !report.sufficient} className="space-x-1">
                <Icon name={ai.status === "loading" ? "hourglass_top" : "auto_awesome"} size={16} className={ai.status === "loading" ? "animate-spin" : undefined} />
                <span className="font-label-caps text-label-caps">{ai.status === "done" ? "ULANGI ANALISIS" : "BUAT ANALISIS AI"}</span>
              </Button>
            </div>

            {!report.sufficient && (
              <p className="mt-2 font-body-sm text-body-sm text-on-surface-variant">Data yang tersedia terlalu sedikit untuk dianalisis, jadi AI tidak dipanggil.</p>
            )}
            {ai.status === "idle" && report.sufficient && (
              <p className="mt-2 font-body-sm text-body-sm text-on-surface-variant">
                AI hanya menafsirkan angka di atas, tanpa rekomendasi beli/jual. Dipanggil saat Anda menekan tombol agar kuota gratis hemat.
              </p>
            )}
            {ai.status === "loading" && <Skeleton className="mt-3 h-24 w-full" />}
            {ai.status === "error" && (
              <p role="alert" className="mt-3 flex items-start gap-1.5 font-body-sm text-body-sm text-error">
                <Icon name="error" size={16} />
                <span>{ai.message}</span>
              </p>
            )}
            {ai.status === "done" && ai.data.skippedReason && (
              <p className="mt-3 font-body-sm text-body-sm text-on-surface-variant">{ai.data.skippedReason}</p>
            )}
            {ai.status === "done" && ai.data.analysis && (
              <div className="mt-3 space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={cn("px-2 py-0.5 rounded font-label-caps text-label-caps font-semibold", OUTLOOK[ai.data.analysis.outlook].cls)}>
                    {OUTLOOK[ai.data.analysis.outlook].label}
                  </span>
                  <span className="font-label-caps text-label-caps text-outline">KEYAKINAN: {ai.data.analysis.confidence.toUpperCase()}</span>
                </div>
                <p className="font-body-lg text-body-lg text-on-surface">{ai.data.analysis.summary}</p>
                <div className="grid gap-4 md:grid-cols-2">
                  <PointList title="KEKUATAN" icon="trending_up" tone="text-secondary" items={ai.data.analysis.strengths} />
                  <PointList title="RISIKO" icon="trending_down" tone="text-error" items={ai.data.analysis.risks} />
                </div>
                {ai.data.analysis.valuationView && (
                  <p className="font-body-md text-body-md text-on-surface-variant">
                    <strong className="text-on-surface">Valuasi: </strong>
                    {ai.data.analysis.valuationView}
                  </p>
                )}
                {ai.data.analysis.dataGaps.length > 0 && (
                  <p className="font-body-sm text-body-sm text-outline">Data yang tidak tersedia: {ai.data.analysis.dataGaps.join("; ")}.</p>
                )}
                <p className="font-label-caps text-label-caps text-outline">
                  {ai.data.meta.providerLabel} · {ai.data.meta.model} · {fmtTimeWib(ai.data.meta.generatedAt, false)}
                  {ai.data.meta.cached
                    ? " · DARI CACHE · 0 TOKEN BARU"
                    : ai.data.meta.tokens
                      ? ` · TOKEN: ${ai.data.meta.tokens.input} MASUK + ${ai.data.meta.tokens.output} KELUAR${ai.data.meta.tokens.thoughts ? ` + ${ai.data.meta.tokens.thoughts} BERPIKIR` : ""} = ${ai.data.meta.tokens.total}`
                      : ""}
                </p>
              </div>
            )}
            <p className="mt-3 font-body-sm text-body-sm text-outline">
              Dihasilkan AI dan bisa keliru. Cocokkan dengan angka di atas dan laporan keuangan resmi emiten. Bukan saran investasi.
            </p>
          </div>
        </>
      )}
    </section>
  );
}
