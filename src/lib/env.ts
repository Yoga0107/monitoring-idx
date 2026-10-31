/** Server-side environment access. Never import this file from a client component. */

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
