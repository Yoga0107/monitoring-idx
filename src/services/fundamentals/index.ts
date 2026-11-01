import "server-only";
import type { FundamentalsResponse } from "@/types/fundamentals";
import { cached } from "@/lib/cache";
import { buildReport } from "./metrics";
import { fetchYahooFundamentals } from "./yahoo";

/** Fundamentals change quarterly, so a long cache is fine and protects the unofficial source. */
const TTL_MS = 6 * 60 * 60_000;

export async function getFundamentals(symbol: string): Promise<FundamentalsResponse> {
  const { value, hit } = await cached(`fundamentals:${symbol}`, TTL_MS, async () => {
    const raw = await fetchYahooFundamentals(symbol);
    const fetchedAt = new Date().toISOString();
    return { report: buildReport(raw, fetchedAt), fetchedAt };
  });
  return {
    report: value.report,
    meta: { providerLabel: "YAHOO FINANCE (UNOFFICIAL)", fetchedAt: value.fetchedAt, cached: hit },
  };
}
