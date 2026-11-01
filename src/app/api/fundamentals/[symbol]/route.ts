import type { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/api";
import { normalizeSymbol } from "@/lib/symbols";
import { getFundamentals } from "@/services/fundamentals";
import { MarketDataError } from "@/services/market-data/provider";

export const dynamic = "force-dynamic";

/** GET /api/fundamentals/BBCA — fundamental metrics (no AI involved). */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ symbol: string }> }) {
  try {
    const symbol = normalizeSymbol((await params).symbol);
    if (!symbol) throw new MarketDataError("Invalid ticker. Use an IDX code such as BBCA.", "BAD_REQUEST", 400);
    return jsonOk(await getFundamentals(symbol), 3600);
  } catch (e) {
    return jsonError(e);
  }
}
