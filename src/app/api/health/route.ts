import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import { runHealthCheck } from "@/services/market-data/health";

export const dynamic = "force-dynamic";

/** GET /api/health — live connectivity check of every data provider. HTTP 503 when the default source is failing. */
export async function GET() {
  try {
    const report = await runHealthCheck();
    return NextResponse.json(report, {
      status: report.overall.status === "fail" ? 503 : 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    return jsonError(e);
  }
}
