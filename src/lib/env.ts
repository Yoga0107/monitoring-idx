/** Server-side environment access. Never import this file from a client component. */
import { SOURCE_CHOICES, type SourceChoice } from "@/types/market";

export function parseSource(raw: string | null | undefined): SourceChoice | null {
  const v = raw?.trim().toLowerCase();
  return SOURCE_CHOICES.find((s) => s === v) ?? null;
}

/** Used when a request has no ?source=. Set MARKET_DATA_PROVIDER to auto | yahoo | mock. */
export function getDefaultSource(): SourceChoice {
  return parseSource(process.env.MARKET_DATA_PROVIDER) ?? "auto";
}

/** Optional Yahoo symbol overrides, e.g. YAHOO_SYMBOL_IDX30. Empty = not configured. */
export function getYahooSymbol(code: string): string {
  const defaults: Record<string, string> = { IHSG: "^JKSE", LQ45: "^JKLQ45" };
  const override = process.env[`YAHOO_SYMBOL_${code}`]?.trim();
  return override ?? defaults[code] ?? "";
}

/** For keyed vendors you add later. Read it only inside a provider. */
export function getMarketDataApiKey(): string | undefined {
  return process.env.MARKET_DATA_API_KEY?.trim() || undefined;
}
