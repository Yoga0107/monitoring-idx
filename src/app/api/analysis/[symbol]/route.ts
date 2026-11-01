import { NextResponse, type NextRequest } from "next/server";
import { jsonError } from "@/lib/api";
import { normalizeSymbol } from "@/lib/symbols";
import { analyzeSymbol } from "@/services/analysis";
import { AnalysisError } from "@/services/analysis/provider";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** POST /api/analysis/BBCA — AI reading of the fundamentals. POST + user click so crawlers never burn the free quota. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ symbol: string }> }) {
  try {
    const symbol = normalizeSymbol((await params).symbol);
    if (!symbol) throw new AnalysisError("Invalid ticker. Use an IDX code such as BBCA.", "BAD_REQUEST", 400);
    const clientId = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
    const result = await analyzeSymbol(symbol, clientId);
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return jsonError(e);
  }
}
