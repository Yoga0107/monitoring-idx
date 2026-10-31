const TZ = "Asia/Jakarta";

export type Tone = "up" | "down" | "flat";

export function toneOf(change: number): Tone {
  return change > 0 ? "up" : change < 0 ? "down" : "flat";
}

export const toneText: Record<Tone, string> = {
  up: "text-secondary",
  down: "text-error",
  flat: "text-outline",
};

export const tonePill: Record<Tone, string> = {
  up: "bg-secondary/10 text-secondary",
  down: "bg-error-container/20 text-error",
  flat: "bg-surface-variant text-outline",
};

export const toneBar: Record<Tone, string> = {
  up: "bg-secondary",
  down: "bg-error",
  flat: "bg-outline",
};

export const toneHex: Record<Tone, string> = { up: "#4edea3", down: "#ffb4ab", flat: "#87929a" };

const formatters = new Map<number, Intl.NumberFormat>();
function numberFormat(decimals: number): Intl.NumberFormat {
  let f = formatters.get(decimals);
  if (!f) {
    f = new Intl.NumberFormat("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    formatters.set(decimals, f);
  }
  return f;
}
const num = numberFormat(2);

export const fmtNum = (v: number, decimals = 2) => numberFormat(decimals).format(v);
export const fmtSigned = (v: number) => `${v > 0 ? "+" : v < 0 ? "-" : ""}${num.format(Math.abs(v))}`;
export const fmtPct = (v: number) => `${fmtSigned(v)}%`;

export function fmtLots(v: number | null): string {
  if (v === null) return "—";
  if (v >= 1e9) return `${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
  return String(v);
}

export function fmtTimeWib(input: Date | string | number, seconds = true): string {
  return (
    new Intl.DateTimeFormat("en-GB", {
      timeZone: TZ,
      hour: "2-digit",
      minute: "2-digit",
      ...(seconds ? { second: "2-digit" } : {}),
      hour12: false,
    }).format(new Date(input)) + " WIB"
  );
}

export function fmtDateId(input: Date): string {
  const parts = new Intl.DateTimeFormat("id-ID", {
    timeZone: TZ,
    weekday: "long",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).formatToParts(input);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("weekday")}, ${get("day")} ${get("month")} ${get("year")}`;
}

/** Axis tick / tooltip label for the chart, per range. */
export function fmtChartTick(ms: number, range: string): string {
  if (range === "1D") return new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false }).format(ms);
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    day: "2-digit",
    month: "short",
    ...(range === "1Y" || range === "6M" ? { year: "2-digit" } : {}),
  }).format(ms);
}

export function fmtChartTooltip(ms: number, range: string): string {
  if (range === "1D") return fmtTimeWib(ms, false);
  const d = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, day: "2-digit", month: "short", year: "numeric" }).format(ms);
  return range === "1W" ? `${d} ${fmtTimeWib(ms, false)}` : d;
}
