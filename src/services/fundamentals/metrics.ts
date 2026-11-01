import type { FundamentalMetric, FundamentalsReport, MetricFormat, MetricGroup } from "@/types/fundamentals";
import type { RawFundamentals } from "./normalizers/yahoo";

const pct = (v: number | null) => (v === null ? null : v * 100);
const round = (v: number | null, d = 4) => (v === null ? null : Math.round(v * 10 ** d) / 10 ** d);

/** Core metrics used to decide whether there is enough data to analyse. */
const CORE = ["per", "pbv", "eps", "roe", "net_margin", "revenue_growth", "earnings_growth", "dividend_yield", "revenue", "market_cap"];

export function buildReport(f: RawFundamentals, asOf: string): FundamentalsReport {
  const isFinancial = /financial/i.test(f.sector ?? "");
  const m: FundamentalMetric[] = [];
  const add = (key: string, label: string, group: MetricGroup, value: number | null, format: MetricFormat, note?: string) =>
    m.push({ key, label, group, value: round(value), format, ...(note ? { note } : {}) });

  // Dividend yield is a fraction in the summary module; guard against a feed that already sends percent.
  const dy = f.dividendYield === null ? null : f.dividendYield > 1 ? f.dividendYield : f.dividendYield * 100;

  add("per", "PER (trailing)", "valuation", f.trailingPE, "multiple", f.trailingPE !== null && f.trailingPE < 0 ? "Negatif: perusahaan rugi" : undefined);
  add("per_forward", "PER (forward)", "valuation", f.forwardPE, "multiple");
  add("pbv", "PBV", "valuation", f.priceToBook, "multiple");
  add("eps", "EPS (trailing)", "valuation", f.trailingEps, "price");
  add("book_value", "Nilai buku / saham", "valuation", f.bookValue, "price");
  add("dividend_yield", "Dividend yield", "valuation", dy, "percent");
  add("payout_ratio", "Payout ratio", "valuation", pct(f.payoutRatio), "percent");
  add("market_cap", "Kapitalisasi pasar", "valuation", f.marketCap, "currency");

  add("roe", "ROE", "profitability", pct(f.returnOnEquity), "percent");
  add("roa", "ROA", "profitability", pct(f.returnOnAssets), "percent");
  add("net_margin", "Margin laba bersih", "profitability", pct(f.profitMargin), "percent");
  add("operating_margin", "Margin operasi", "profitability", pct(f.operatingMargin), "percent");
  add("gross_margin", "Margin kotor", "profitability", pct(f.grossMargin), "percent");

  add("revenue_growth", "Pertumbuhan pendapatan", "growth", pct(f.revenueGrowth), "percent");
  add("earnings_growth", "Pertumbuhan laba", "growth", pct(f.earningsGrowth), "percent");
  add("revenue", "Pendapatan (TTM)", "growth", f.totalRevenue, "currency");
  add("ebitda", "EBITDA", "growth", f.ebitda, "currency");

  const netDebt = f.totalDebt !== null && f.totalCash !== null ? f.totalDebt - f.totalCash : null;
  const na = isFinancial ? "Kurang bermakna untuk bank/lembaga keuangan" : undefined;
  add("der", "Debt to equity (x)", "health", f.debtToEquity === null ? null : f.debtToEquity / 100, "multiple", na);
  add("current_ratio", "Current ratio", "health", f.currentRatio, "multiple", na);
  add("total_debt", "Total utang", "health", f.totalDebt, "currency", na);
  add("total_cash", "Kas", "health", f.totalCash, "currency");
  add("net_debt", "Utang bersih", "health", netDebt, "currency", na);
  add("free_cashflow", "Free cash flow", "health", f.freeCashflow, "currency", na);
  add("operating_cashflow", "Arus kas operasi", "health", f.operatingCashflow, "currency", na);

  const range = f.fiftyTwoWeekHigh !== null && f.fiftyTwoWeekLow !== null ? f.fiftyTwoWeekHigh - f.fiftyTwoWeekLow : null;
  const pos = range && range > 0 && f.price !== null ? ((f.price - (f.fiftyTwoWeekLow ?? 0)) / range) * 100 : null;
  add("price", "Harga", "market", f.price, "price");
  add("high_52w", "Tertinggi 52 minggu", "market", f.fiftyTwoWeekHigh, "price");
  add("low_52w", "Terendah 52 minggu", "market", f.fiftyTwoWeekLow, "price");
  add("range_pos_52w", "Posisi di rentang 52 minggu", "market", pos, "percent", "0% = terendah, 100% = tertinggi");
  add("beta", "Beta", "market", f.beta, "number");

  const availableCore = CORE.filter((k) => m.find((x) => x.key === k)?.value != null).length;

  const caveats = [
    "Data berasal dari Yahoo Finance (tidak resmi) dan bisa tertinggal dari laporan keuangan terbaru emiten.",
    "Angka pertumbuhan umumnya membandingkan kuartal terbaru dengan kuartal yang sama tahun lalu, bukan tren multi-tahun.",
  ];
  if (isFinancial) {
    caveats.push(
      "Emiten sektor keuangan (misalnya bank): rasio utang, current ratio, dan arus kas bebas kurang bermakna, dan metrik khas bank seperti NIM, NPL, dan CAR tidak tersedia dalam data ini.",
    );
  }

  return {
    symbol: f.symbol,
    name: f.name,
    sector: f.sector,
    industry: f.industry,
    currency: f.currency,
    asOf,
    metrics: m,
    coverage: { available: m.filter((x) => x.value !== null).length, total: m.length },
    caveats,
    sufficient: availableCore >= 5,
  };
}
