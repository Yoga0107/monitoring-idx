import type { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/api";
import { parseSource } from "@/lib/env";
import { getMarketSnapshot } from "@/services/market-data";
import { MarketDataError } from "@/services/market-data/provider";
import { SOURCE_CHOICES } from "@/types/market";

export const dynamic = "force-dynamic";

/** GET /api/market/indices[?source=auto|yahoo|mock] — latest quotes for IHSG, LQ45, IDX30, IDX80. */
export async function GET(request: NextRequest) {
  try {
    const raw = request.nextUrl.searchParams.get("source");
    const source = parseSource(raw);
    if (raw !== null && !source) {
      throw new MarketDataError(`Invalid source. Use one of: ${SOURCE_CHOICES.join(", ")}`, "BAD_REQUEST", 400);
    }
    const snapshot = await getMarketSnapshot(source ?? undefined);
    return jsonOk(snapshot, snapshot.marketStatus.state === "CLOSED" ? 300 : 30);
  } catch (e) {
    return jsonError(e);
  }
}
