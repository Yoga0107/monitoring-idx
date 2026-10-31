import { cn } from "@/lib/utils";

/** Material Symbols Outlined glyph (font loaded in the root layout). */
export function Icon({ name, size = 18, className }: { name: string; size?: number; className?: string }) {
  return (
    <span aria-hidden className={cn("material-symbols-outlined", className)} style={{ fontSize: size }}>
      {name}
    </span>
  );
}
