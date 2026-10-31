/** IDX ticker helpers. Pure, safe for both server and client. */
export const MAX_SYMBOLS = 12;
const TICKER = /^[A-Z0-9]{2,6}$/;

/** "bbca", " BBCA.JK " -> "BBCA". Returns null when it is not a plausible IDX ticker. */
export function normalizeSymbol(raw: string): string | null {
  const s = raw.trim().toUpperCase().replace(/\.JK$/, "");
  return TICKER.test(s) ? s : null;
}

export function parseSymbols(raw: string | null): { symbols: string[]; invalid: string[] } {
  const symbols: string[] = [];
  const invalid: string[] = [];
  for (const part of (raw ?? "").split(",")) {
    if (!part.trim()) continue;
    const s = normalizeSymbol(part);
    if (!s) invalid.push(part.trim());
    else if (!symbols.includes(s)) symbols.push(s);
  }
  return { symbols, invalid };
}
