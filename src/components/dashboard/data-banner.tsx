import type { MarketSnapshot, SourceChoice } from "@/types/market";
import { cn } from "@/lib/utils";
import { SourceSelector } from "./source-selector";

interface Props {
  snapshot: MarketSnapshot | null;
  error: string | null;
  /** The viewer's saved choice (null = server default). */
  source: SourceChoice | null;
  onSourceChange: (s: SourceChoice) => void;
}

/** Always tells the viewer how fresh (or fake) the numbers are, and lets them pick the source. */
export function DataBanner({ snapshot, error, source, onSourceChange }: Props) {
  const selected = source ?? snapshot?.meta.requestedSource ?? "auto";
  const shell = "px-6 py-1.5 bg-surface-container-lowest border-b border-outline-variant flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 text-outline";

  if (!snapshot) {
    return (
      <div className={shell}>
        <span className="font-body-sm text-body-sm">{error ? "No data feed connected." : "Connecting to data feed…"}</span>
        <SourceSelector value={selected} onChange={onSourceChange} />
      </div>
    );
  }

  const { meta } = snapshot;
  const copy = {
    mock: { badge: "MOCK DATA FEED", text: "Sandbox mode — synthetic values for development, not real market prices.", tone: "text-primary" },
    realtime: { badge: "REAL-TIME", text: `Streaming from ${meta.providerLabel}.`, tone: "text-secondary" },
    delayed: {
      badge: `DELAYED${meta.delayMinutes ? ` ~${meta.delayMinutes} MIN` : ""}`,
      text: `Prices from ${meta.providerLabel} are delayed and not suitable for trading decisions.`,
      tone: "text-primary",
    },
    "end-of-day": {
      badge: "END-OF-DAY",
      text: `Market is closed — showing the last official close from ${meta.providerLabel}.`,
      tone: "text-on-surface-variant",
    },
  }[meta.dataMode];

  return (
    <div className={shell}>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0">
        <span className={cn("font-label-caps text-label-caps px-1.5 py-0.5 rounded bg-surface-variant font-bold shrink-0", copy.tone)}>{copy.badge}</span>
        {meta.fallback && (
          <span className="font-label-caps text-label-caps px-1.5 py-0.5 rounded bg-error-container/20 text-error font-bold shrink-0">FALLBACK</span>
        )}
        <span className="font-body-sm text-body-sm text-on-surface-variant">
          {meta.fallback ? `Yahoo Finance unavailable (${meta.fallbackReason}) — showing mock data instead.` : copy.text}
        </span>
      </div>
      <SourceSelector value={selected} onChange={onSourceChange} />
    </div>
  );
}
