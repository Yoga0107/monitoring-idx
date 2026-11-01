import "server-only";
import type { AnalysisContent, AnalysisPoint, AnalysisResponse, Confidence, Outlook } from "@/types/fundamentals";
import { cached } from "@/lib/cache";
import { hitLimit } from "@/lib/rate-limit";
import { getFundamentals } from "@/services/fundamentals";
import { buildUserPrompt, SYSTEM_PROMPT } from "./prompt";
import { AnalysisError, type AnalysisProvider } from "./provider";
import { GeminiProvider } from "./providers/gemini";

let provider: AnalysisProvider | null = null;
/** The single active AI provider. Return a different AnalysisProvider here to switch vendors. */
export function getAnalysisProvider(): AnalysisProvider {
  return (provider ??= new GeminiProvider());
}

const TTL_MS = 6 * 60 * 60_000;
const PER_CLIENT_LIMIT = 5; // per minute
const DAILY_LIMIT = Math.max(1, Number(process.env.ANALYSIS_DAILY_LIMIT) || 80);

const OUTLOOKS: Outlook[] = ["positif", "netral", "negatif", "data_tidak_cukup"];
const CONFIDENCES: Confidence[] = ["rendah", "sedang", "tinggi"];

const text = (v: unknown, max: number): string => (typeof v === "string" ? v.trim().slice(0, max) : "");
function points(v: unknown): AnalysisPoint[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((p) => ({ point: text((p as Record<string, unknown>)?.point, 300), evidence: text((p as Record<string, unknown>)?.evidence, 200) }))
    .filter((p) => p.point)
    .slice(0, 4);
}

/** Parses and validates the model's JSON. Anything off-shape is rejected rather than shown. */
export function parseAnalysis(raw: string): AnalysisContent {
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  let obj: Record<string, unknown>;
  try {
    obj = JSON.parse(cleaned) as Record<string, unknown>;
  } catch {
    throw new AnalysisError("The AI answer was not valid JSON. Try again.", "BAD_OUTPUT", 502);
  }
  const outlook = OUTLOOKS.find((o) => o === obj.outlook);
  const confidence = CONFIDENCES.find((c) => c === obj.confidence);
  const summary = text(obj.summary, 800);
  if (!outlook || !confidence || !summary) {
    throw new AnalysisError("The AI answer was missing required fields. Try again.", "BAD_OUTPUT", 502);
  }
  return {
    summary,
    outlook,
    confidence,
    strengths: points(obj.strengths),
    risks: points(obj.risks),
    valuationView: text(obj.valuationView, 500),
    dataGaps: Array.isArray(obj.dataGaps) ? obj.dataGaps.map((d) => text(d, 160)).filter(Boolean).slice(0, 8) : [],
  };
}

/** Runs (or reuses a cached) AI analysis. Rate limits only count real model calls, not cache hits. */
export async function analyzeSymbol(symbol: string, clientId: string): Promise<AnalysisResponse> {
  const { report } = (await getFundamentals(symbol));
  const ai = getAnalysisProvider();

  if (!report.sufficient) {
    return {
      symbol,
      analysis: null,
      skippedReason: "Data fundamental yang tersedia terlalu sedikit untuk dianalisis dengan layak, jadi AI tidak dipanggil.",
      meta: { model: ai.model, providerLabel: ai.label, generatedAt: new Date().toISOString(), cached: false, fundamentalsAsOf: report.asOf, tokens: null },
    };
  }

  const { value, hit } = await cached(`analysis:${symbol}:${report.asOf}`, TTL_MS, async () => {
    const mine = hitLimit(`ai:client:${clientId}`, PER_CLIENT_LIMIT, 60_000);
    if (!mine.ok) throw new AnalysisError(`Too many analysis requests. Try again in ${mine.retryAfterSec}s.`, "RATE_LIMITED", 429);
    const all = hitLimit("ai:global-day", DAILY_LIMIT, 24 * 60 * 60_000);
    if (!all.ok) throw new AnalysisError("The daily AI analysis limit for this app has been reached. Try again tomorrow.", "RATE_LIMITED", 429);

    const { text: raw, usage } = await ai.generateJson({ system: SYSTEM_PROMPT, user: buildUserPrompt(report) });
    if (usage) console.info(`[analysis] ${symbol}: ${usage.input} in / ${usage.output} out / ${usage.thoughts} thinking = ${usage.total} tokens`);
    return { analysis: parseAnalysis(raw), generatedAt: new Date().toISOString(), usage };
  });

  return {
    symbol,
    analysis: value.analysis,
    skippedReason: null,
    meta: { model: ai.model, providerLabel: ai.label, generatedAt: value.generatedAt, cached: hit, fundamentalsAsOf: report.asOf, tokens: hit ? null : value.usage },
  };
}
