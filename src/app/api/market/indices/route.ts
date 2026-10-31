import { jsonError, jsonOk } from "@/lib/api";
import { getMarketSnapshot } from "@/services/market-data";

export const dynamic = "force-dynamic";

/** GET /api/market/indices — latest quotes for IHSG, LQ45, IDX30, IDX80. */
export async function GET() {
  try {
    const snapshot = await getMarketSnapshot();
    return jsonOk(snapshot, snapshot.marketStatus.state === "CLOSED" ? 300 : 15);
  } catch (e) {
    return jsonError(e);
  }
}
