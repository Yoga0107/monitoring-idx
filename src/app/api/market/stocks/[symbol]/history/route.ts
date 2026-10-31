import type { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/api";
import { normalizeSymbol } from "@/lib/symbols";
import { getStockHistory } from "@/services/market-data";
import { MarketDataError } from "@/services/market-data/provider";
import { TIME_RANGES, type TimeRange } from "@/types/market";

export const dynamic = "force-dynamic";

/** GET /api/market/stocks/BBCA/history?range=1M */
export async function GET(request: NextRequest, { params }: { params: Promise<{ symbol: string }> }) {
  try {
    const symbol = normalizeSymbol((await params).symbol);
    if (!symbol) throw new MarketDataError("Invalid ticker. Use an IDX code such as BBCA.", "BAD_REQUEST", 400);

    const range = (request.nextUrl.searchParams.get("range") ?? "1D").toUpperCase();
    if (!TIME_RANGES.includes(range as TimeRange)) {
      throw new MarketDataError(`Invalid range. Use one of: ${TIME_RANGES.join(", ")}`, "BAD_REQUEST", 400);
    }
    const history = await getStockHistory(symbol, range as TimeRange);
    return jsonOk(history, range === "1D" ? 30 : 900);
  } catch (e) {
    return jsonError(e);
  }
}
