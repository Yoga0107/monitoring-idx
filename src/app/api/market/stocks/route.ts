import type { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/api";
import { MAX_SYMBOLS, parseSymbols } from "@/lib/symbols";
import { getStocksSnapshot } from "@/services/market-data";
import { MarketDataError } from "@/services/market-data/provider";

export const dynamic = "force-dynamic";

/** GET /api/market/stocks?symbols=BBCA,BBRI */
export async function GET(request: NextRequest) {
  try {
    const { symbols, invalid } = parseSymbols(request.nextUrl.searchParams.get("symbols"));
    if (invalid.length > 0) {
      throw new MarketDataError(`Invalid ticker(s): ${invalid.join(", ")}. Use IDX codes such as BBCA.`, "BAD_REQUEST", 400);
    }
    if (symbols.length === 0 || symbols.length > MAX_SYMBOLS) {
      throw new MarketDataError(`Provide between 1 and ${MAX_SYMBOLS} symbols.`, "BAD_REQUEST", 400);
    }
    const snapshot = await getStocksSnapshot(symbols);
    return jsonOk(snapshot, snapshot.marketStatus.state === "CLOSED" ? 300 : 15);
  } catch (e) {
    return jsonError(e);
  }
}
