import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { fmtNum, fmtPct, fmtSigned, toneBar, toneOf, tonePill, toneText } from "@/lib/format";
import { cn } from "@/lib/utils";
import { INDICES } from "@/services/market-data/indices";
import type { IndexQuote, MarketSnapshot } from "@/types/market";
import { ErrorPanel } from "./states";
import { Sparkline } from "./sparkline";

const CARD = "p-3 bg-surface-container-low border border-outline-variant rounded-lg hover:border-primary-container transition-colors";

function SummaryCard({ q }: { q: IndexQuote }) {
  const tone = toneOf(q.change);
  const span = q.high - q.low;
  const pos = span > 0 ? Math.min(100, Math.max(0, ((q.last - q.low) / span) * 100)) : 50;
  return (
    <article className={CARD} aria-label={`${q.name} summary`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-1.5">
          <span className="font-headline-md text-headline-md text-on-surface font-semibold tracking-tight">{q.name}</span>
          <span className="font-label-caps text-label-caps px-1 rounded bg-surface-container-high text-outline">{q.tag}</span>
        </div>
        <span className={cn("inline-flex items-center space-x-1 px-1.5 py-0.5 rounded font-data-mono-sm text-data-mono-sm font-semibold", tonePill[tone])}>
          {tone !== "flat" && <Icon name={tone === "up" ? "north" : "south"} size={13} />}
          <span>{fmtPct(q.changePct)}</span>
        </span>
      </div>
      <div className="mt-2 flex items-baseline justify-between">
        <span className="font-data-mono-xl text-data-mono-xl font-bold text-on-surface">{fmtNum(q.last)}</span>
        <span className={cn("font-data-mono-sm text-data-mono-sm font-medium", toneText[tone])}>{fmtSigned(q.change)}</span>
      </div>
      <div className="mt-2">
        <Sparkline values={q.sparkline} tone={tone} />
      </div>
      <div className="mt-2 pt-2 border-t border-outline-variant flex items-center justify-between text-outline">
        <span className="font-label-caps text-label-caps">L: {fmtNum(q.low)}</span>
        <div className="flex-1 mx-2 h-1 bg-surface-variant rounded-full overflow-hidden" role="presentation">
          <div className={cn("h-full rounded-full", toneBar[tone])} style={{ width: `${pos}%` }} />
        </div>
        <span className="font-label-caps text-label-caps text-on-surface">H: {fmtNum(q.high)}</span>
      </div>
    </article>
  );
}

function UnavailableCard({ name, tag, reason }: { name: string; tag: string; reason: string }) {
  return (
    <article className={cn(CARD, "flex flex-col justify-between min-h-[190px]")}>
      <div className="flex items-center space-x-1.5">
        <span className="font-headline-md text-headline-md text-on-surface font-semibold tracking-tight">{name}</span>
        <span className="font-label-caps text-label-caps px-1 rounded bg-surface-container-high text-outline">{tag}</span>
      </div>
      <div className="flex flex-col items-center gap-1 text-center py-4">
        <Icon name="cloud_off" size={22} className="text-outline" />
        <span className="font-body-sm text-body-sm text-on-surface-variant">Not available from this data source</span>
        <span className="font-label-caps text-label-caps text-outline">{reason}</span>
      </div>
    </article>
  );
}

function CardSkeleton() {
  return (
    <div className={CARD} aria-hidden>
      <div className="flex justify-between"><Skeleton className="h-6 w-24" /><Skeleton className="h-6 w-16" /></div>
      <Skeleton className="mt-3 h-7 w-32" />
      <Skeleton className="mt-3 h-9 w-full" />
      <Skeleton className="mt-3 h-3 w-full" />
    </div>
  );
}

interface Props {
  snapshot: MarketSnapshot | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

export function SummaryCards({ snapshot, loading, error, onRetry }: Props) {
  if (!snapshot && error) {
    return (
      <section aria-label="Index Summary Cards" className="bg-surface-container-low border border-outline-variant rounded-lg">
        <ErrorPanel message={error} onRetry={onRetry} />
      </section>
    );
  }
  return (
    <section aria-label="Index Summary Cards" aria-busy={loading} className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {!snapshot
        ? INDICES.map((i) => <CardSkeleton key={i.code} />)
        : INDICES.map((def) => {
            const q = snapshot.quotes.find((x) => x.code === def.code);
            if (q) return <SummaryCard key={def.code} q={q} />;
            const reason = snapshot.unavailable.find((u) => u.code === def.code)?.reason ?? "No data";
            return <UnavailableCard key={def.code} name={def.name} tag={def.tag} reason={reason} />;
          })}
    </section>
  );
}
