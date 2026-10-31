import { Button } from "@/components/ui/button";
import { SOURCE_CHOICES, type SourceChoice } from "@/types/market";

const LABEL: Record<SourceChoice, string> = { auto: "AUTO", yahoo: "YAHOO", mock: "MOCK" };
const HINT: Record<SourceChoice, string> = {
  auto: "Try Yahoo Finance, fall back to mock data if it fails",
  yahoo: "Yahoo Finance only (delayed, unofficial)",
  mock: "Synthetic mock data",
};

export function SourceSelector({ value, onChange }: { value: SourceChoice; onChange: (s: SourceChoice) => void }) {
  return (
    <div className="flex items-center space-x-2">
      <span className="hidden md:inline font-label-caps text-label-caps text-outline">SOURCE</span>
      <div role="group" aria-label="Data source" className="flex items-center space-x-1 p-0.5 bg-surface-container rounded border border-outline-variant">
        {SOURCE_CHOICES.map((s) => (
          <Button key={s} size="none" title={HINT[s]} variant={s === value ? "tabActive" : "tab"} aria-pressed={s === value} onClick={() => onChange(s)}>
            {LABEL[s]}
          </Button>
        ))}
      </div>
    </div>
  );
}
