import type { MarketSnapshot } from "@/types/market";

export function Footer({ snapshot }: { snapshot: MarketSnapshot | null }) {
  return (
    <footer className="px-6 py-2 bg-surface border-t border-outline-variant flex flex-wrap items-center justify-between gap-2 font-label-caps text-label-caps text-outline">
      <div>Market Insight • Personal Financial Analytics • Bursa Efek Indonesia (IDX) • Informational only, not investment advice</div>
      <div className="flex items-center space-x-3">
        <span>SESSION: {snapshot?.marketStatus.session ?? "—"}</span>
        <span>•</span>
        <span className="text-secondary">WIB UTC+7</span>
      </div>
    </footer>
  );
}
