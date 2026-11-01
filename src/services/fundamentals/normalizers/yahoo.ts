import { MarketDataError } from "@/services/market-data/provider";

/** Yahoo quoteSummary modules we request. */
export const YAHOO_MODULES = ["price", "summaryDetail", "defaultKeyStatistics", "financialData", "assetProfile"] as const;

type Module = Record<string, unknown> | undefined;
export interface QuoteSummaryResponse {
  quoteSummary?: {
    result?: Array<Partial<Record<(typeof YAHOO_MODULES)[number], Module>>> | null;
    error?: { code?: string; description?: string } | null;
  };
}

/** Raw (unitless) numbers exactly as the source reports them. */
export interface RawFundamentals {
  symbol: string;
  name: string | null;
  sector: string | null;
  industry: string | null;
  currency: string | null;
  price: number | null;
  marketCap: number | null;
  trailingPE: number | null;
  forwardPE: number | null;
  priceToBook: number | null;
  bookValue: number | null;
  trailingEps: number | null;
  beta: number | null;
  dividendYield: number | null;
  dividendRate: number | null;
  payoutRatio: number | null;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  profitMargin: number | null;
  operatingMargin: number | null;
  grossMargin: number | null;
  returnOnEquity: number | null;
  returnOnAssets: number | null;
  revenueGrowth: number | null;
  earningsGrowth: number | null;
  totalRevenue: number | null;
  ebitda: number | null;
  freeCashflow: number | null;
  operatingCashflow: number | null;
  totalCash: number | null;
  totalDebt: number | null;
  /** Yahoo reports this in percent (45.3 = 0.453x). */
  debtToEquity: number | null;
  currentRatio: number | null;
}

/** Yahoo wraps numbers as { raw, fmt }; empty objects mean "no data". */
function num(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (v && typeof v === "object" && "raw" in v) {
    const r = (v as { raw?: unknown }).raw;
    return typeof r === "number" && Number.isFinite(r) ? r : null;
  }
  return null;
}
const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);

export function normalizeYahooFundamentals(raw: QuoteSummaryResponse, symbol: string): RawFundamentals {
  const err = raw.quoteSummary?.error;
  if (err) {
    const notFound = /not found/i.test(`${err.code ?? ""} ${err.description ?? ""}`);
    throw new MarketDataError(err.description ?? "Yahoo returned an error", notFound ? "NOT_FOUND" : "UPSTREAM_ERROR", notFound ? 404 : 502);
  }
  const r = raw.quoteSummary?.result?.[0];
  if (!r) throw new MarketDataError(`No fundamentals returned for ${symbol}`, "NOT_FOUND", 404);

  const price = r.price ?? {};
  const sd = r.summaryDetail ?? {};
  const ks = r.defaultKeyStatistics ?? {};
  const fd = r.financialData ?? {};
  const ap = r.assetProfile ?? {};

  return {
    symbol,
    name: str(price.longName) ?? str(price.shortName),
    sector: str(ap.sector),
    industry: str(ap.industry),
    currency: str(fd.financialCurrency) ?? str(price.currency),
    price: num(fd.currentPrice) ?? num(price.regularMarketPrice),
    marketCap: num(price.marketCap) ?? num(sd.marketCap),
    trailingPE: num(sd.trailingPE),
    forwardPE: num(sd.forwardPE) ?? num(ks.forwardPE),
    priceToBook: num(ks.priceToBook),
    bookValue: num(ks.bookValue),
    trailingEps: num(ks.trailingEps),
    beta: num(ks.beta) ?? num(sd.beta),
    dividendYield: num(sd.dividendYield),
    dividendRate: num(sd.dividendRate),
    payoutRatio: num(sd.payoutRatio),
    fiftyTwoWeekHigh: num(sd.fiftyTwoWeekHigh),
    fiftyTwoWeekLow: num(sd.fiftyTwoWeekLow),
    profitMargin: num(ks.profitMargins) ?? num(fd.profitMargins),
    operatingMargin: num(fd.operatingMargins),
    grossMargin: num(fd.grossMargins),
    returnOnEquity: num(fd.returnOnEquity),
    returnOnAssets: num(fd.returnOnAssets),
    revenueGrowth: num(fd.revenueGrowth),
    earningsGrowth: num(fd.earningsGrowth) ?? num(ks.earningsQuarterlyGrowth),
    totalRevenue: num(fd.totalRevenue),
    ebitda: num(fd.ebitda),
    freeCashflow: num(fd.freeCashflow),
    operatingCashflow: num(fd.operatingCashflow),
    totalCash: num(fd.totalCash),
    totalDebt: num(fd.totalDebt),
    debtToEquity: num(fd.debtToEquity),
    currentRatio: num(fd.currentRatio),
  };
}
