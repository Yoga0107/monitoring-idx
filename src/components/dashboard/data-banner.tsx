import type { MarketSnapshot } from "@/types/market";
import { cn } from "@/lib/utils";

/** Always tells the viewer how fresh (or fake) the numbers are. */
export function DataBanner({ snapshot, error }: { snapshot: MarketSnapshot | null; error: string | null }) {
  if (!snapshot) {
    return (
      <div className="px-6 py-1.5 bg-surface-container-lowest border-b border-outline-variant text-outline font-body-sm text-body-sm">
        {error ? "No data feed connected." : "Connecting to data feed…"}
      </div>
    );
  }
  const { meta, marketStatus } = snapshot;
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
    <div className="px-6 py-1.5 bg-surface-container-lowest border-b border-outline-variant flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-outline">
      <div className="flex items-center space-x-2 min-w-0">
        <span className={cn("font-label-caps text-label-caps px-1.5 py-0.5 rounded bg-surface-variant font-bold shrink-0", copy.tone)}>{copy.badge}</span>
        <span className="font-body-sm text-body-sm text-on-surface-variant">{copy.text}</span>
      </div>
      <div className="hidden sm:flex items-center space-x-3">
        <span className="font-label-caps text-label-caps text-outline">{marketStatus.session}</span>
        <span className="w-1 h-1 rounded-full bg-outline" />
        <span className="font-label-caps text-label-caps text-secondary font-semibold">BURSA EFEK INDONESIA</span>
      </div>
    </div>
  );
}
