"use client";

import { useCallback, useEffect, useState } from "react";
import { MAX_SYMBOLS, normalizeSymbol } from "@/lib/symbols";

const KEY = "market-insight:watchlist";

export type AddResult = "added" | "exists" | "invalid" | "full";

/**
 * Personal watchlist kept in this browser (localStorage). No account or database.
 * `symbols` is null until the stored list has been read after mount.
 */
export function useWatchlist() {
  const [symbols, setSymbols] = useState<string[] | null>(null);

  useEffect(() => {
    let stored: string[] = [];
    try {
      const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? "[]");
      if (Array.isArray(parsed)) {
        stored = parsed
          .map((v) => (typeof v === "string" ? normalizeSymbol(v) : null))
          .filter((v): v is string => v !== null)
          .slice(0, MAX_SYMBOLS);
      }
    } catch {
      /* corrupt or unavailable storage: start empty */
    }
    setSymbols(stored);
  }, []);

  const persist = useCallback((next: string[]) => {
    setSymbols(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* ignore: the list still works for this session */
    }
  }, []);

  const add = useCallback(
    (raw: string): { result: AddResult; symbol: string | null } => {
      const symbol = normalizeSymbol(raw);
      if (!symbol) return { result: "invalid", symbol: null };
      const current = symbols ?? [];
      if (current.includes(symbol)) return { result: "exists", symbol };
      if (current.length >= MAX_SYMBOLS) return { result: "full", symbol };
      persist([...current, symbol]);
      return { result: "added", symbol };
    },
    [symbols, persist],
  );

  const remove = useCallback((symbol: string) => persist((symbols ?? []).filter((s) => s !== symbol)), [symbols, persist]);

  return { symbols, add, remove };
}
