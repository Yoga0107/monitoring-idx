import { NextResponse } from "next/server";
import type { ApiErrorBody } from "@/types/market";
import { AnalysisError } from "@/services/analysis/provider";
import { MarketDataError } from "@/services/market-data/provider";

export function jsonOk<T>(body: T, sMaxAgeSeconds: number) {
  return NextResponse.json(body, {
    headers: {
      // Shared CDN cache on Vercel; browsers always revalidate.
      "Cache-Control": `public, max-age=0, s-maxage=${sMaxAgeSeconds}, stale-while-revalidate=${sMaxAgeSeconds * 2}`,
    },
  });
}

export function jsonError(e: unknown) {
  const known = e instanceof MarketDataError || e instanceof AnalysisError;
  const err = known ? e : new MarketDataError("Unexpected server error", "UPSTREAM_ERROR", 500);
  if (!known) console.error("[market-api]", e);
  else console.warn(`[market-api] ${err.code}: ${err.message}`);
  const body: ApiErrorBody = { error: { code: err.code, message: err.message } };
  return NextResponse.json(body, { status: err.status, headers: { "Cache-Control": "no-store" } });
}
