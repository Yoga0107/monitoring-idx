"use client";

import type { IndexQuote, MarketSnapshot } from "@/types/market";
import { PriceChart, type PriceChartProps } from "./price-chart";

type Props = Omit<PriceChartProps, "title" | "subtitle" | "endpoint" | "decimals" | "marketStatus" | "fallbackMeta" | "quote"> & {
  quote: IndexQuote | null;
  snapshot: MarketSnapshot | null;
};

export function IhsgChart({ snapshot, ...rest }: Props) {
  return (
    <PriceChart
      title="IHSG"
      subtitle="Indeks Harga Saham Gabungan"
      endpoint="GET /api/market/history"
      marketStatus={snapshot?.marketStatus ?? null}
      fallbackMeta={snapshot?.meta ?? null}
      {...rest}
    />
  );
}
