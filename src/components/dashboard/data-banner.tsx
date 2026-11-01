import type { DataMeta } from "@/types/market";
import { cn } from "@/lib/utils";

interface Props {
  meta: DataMeta | null;
  error: string | null;
  loading: boolean;
}

/** Always tells the viewer how fresh the numbers are. */
export function DataBanner({ meta, error, loading }: Props) {
  const shell = "px-3 sm:px-6 py-1.5 bg-surface-container-lowest border-b border-outline-variant flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 text-outline";

  if (!meta) {
    return (
      <div className={shell}>
        <span className="font-body-sm text-body-sm">{error ? "No data feed connected." : loading ? "Connecting to data feed…" : "No data requested yet."}</span>
      </div>
    );
  }

  const copy = {
    realtime: { badge: "REAL-TIME", text: `Streaming from ${meta.providerLabel}.`, tone: "text-secondary" },
    delayed: {
      badge: `DELAYED${meta.delayMinutes ? ` ~${meta.delayMinutes} MIN` : ""}`,
      text: `Prices from ${meta.providerLabel} may be delayed: unofficial feed with no real-time guarantee. Not for trading decisions.`,
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
        <span className="font-body-sm text-body-sm text-on-surface-variant">{copy.text}</span>
      </div>
      <span className="hidden sm:inline font-label-caps text-label-caps text-secondary font-semibold">BURSA EFEK INDONESIA</span>
    </div>
  );
}
