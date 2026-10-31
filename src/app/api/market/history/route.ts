import type { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/api";
import { getIndexHistory } from "@/services/market-data";
import { MarketDataError } from "@/services/market-data/provider";
import { TIME_RANGES, type TimeRange } from "@/types/market";

export const dynamic = "force-dynamic";

/** GET /api/market/history?code=IHSG&range=1D */
export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const code = (params.get("code") ?? "IHSG").toUpperCase();
    const range = (params.get("range") ?? "1D").toUpperCase();
    if (!TIME_RANGES.includes(range as TimeRange)) {
      throw new MarketDataError(`Invalid range. Use one of: ${TIME_RANGES.join(", ")}`, "BAD_REQUEST", 400);
    }
    const history = await getIndexHistory(code, range as TimeRange);
    return jsonOk(history, range === "1D" ? 60 : 900);
  } catch (e) {
    return jsonError(e);
  }
}
