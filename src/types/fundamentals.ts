/** Types for fundamental data and AI analysis (shared by API routes and UI). */

export type MetricFormat = "multiple" | "percent" | "currency" | "price" | "number";
export type MetricGroup = "valuation" | "profitability" | "growth" | "health" | "market";

export interface FundamentalMetric {
  key: string;
  label: string;
  group: MetricGroup;
  /** Percent metrics are in percent units (23.4 = 23.4%). Null = not available from the source. */
  value: number | null;
  format: MetricFormat;
  note?: string;
}

export interface FundamentalsReport {
  symbol: string;
  name: string | null;
  sector: string | null;
  industry: string | null;
  currency: string | null;
  /** When the data was fetched from the source. */
  asOf: string;
  metrics: FundamentalMetric[];
  coverage: { available: number; total: number };
  /** Plain-language limits the reader (and the AI) must keep in mind. */
  caveats: string[];
  /** False when too few core metrics exist for a meaningful analysis. */
  sufficient: boolean;
}

export interface FundamentalsResponse {
  report: FundamentalsReport;
  meta: { providerLabel: string; fetchedAt: string; cached: boolean };
}

export type Outlook = "positif" | "netral" | "negatif" | "data_tidak_cukup";
export type Confidence = "rendah" | "sedang" | "tinggi";

export interface AnalysisPoint {
  point: string;
  /** Metric name and value from the data that supports the point. */
  evidence: string;
}

export interface AnalysisContent {
  summary: string;
  outlook: Outlook;
  strengths: AnalysisPoint[];
  risks: AnalysisPoint[];
  valuationView: string;
  dataGaps: string[];
  confidence: Confidence;
}

export interface AnalysisResponse {
  symbol: string;
  /** Null when the analysis was skipped (see skippedReason). */
  analysis: AnalysisContent | null;
  skippedReason: string | null;
  meta: {
    model: string;
    providerLabel: string;
    generatedAt: string;
    cached: boolean;
    fundamentalsAsOf: string;
    /** Tokens spent by THIS request. Null when served from cache (0 new tokens) or unreported. */
    tokens: { input: number; output: number; thoughts: number; total: number } | null;
  };
}
