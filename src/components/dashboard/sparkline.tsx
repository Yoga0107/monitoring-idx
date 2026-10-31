import { toneHex, type Tone } from "@/lib/format";

/** Minimal SVG sparkline (viewBox 160x36, stretched like the Stitch design). */
export function Sparkline({ values, tone }: { values: number[]; tone: Tone }) {
  if (values.length < 2) return <div className="h-9 w-full" />;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const y = (v: number) => 4 + (1 - (v - min) / span) * 28;
  const pts = values.map((v, i) => `${((i / (values.length - 1)) * 160).toFixed(1)},${y(v).toFixed(1)}`);
  const color = toneHex[tone];
  const lastY = y(values[values.length - 1] ?? min);

  return (
    <div className="relative h-9 w-full">
      <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 160 36" aria-hidden>
        <path d={`M ${pts.join(" L ")}`} fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      </svg>
      <span className="absolute w-1.5 h-1.5 rounded-full -translate-x-1/2 -translate-y-1/2" style={{ left: "100%", top: `${(lastY / 36) * 100}%`, background: color }} />
    </div>
  );
}
