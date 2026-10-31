"use client";

import { useCallback, useEffect, useState } from "react";
import { SOURCE_CHOICES, type SourceChoice } from "@/types/market";

const KEY = "market-insight:source";

/**
 * The viewer's chosen data source, remembered in this browser.
 * `null` = no choice made yet, so the server default (MARKET_DATA_PROVIDER) applies.
 */
export function useSource() {
  const [source, setSourceState] = useState<SourceChoice | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(KEY);
      const match = SOURCE_CHOICES.find((s) => s === stored);
      if (match) setSourceState(match);
    } catch {
      /* storage unavailable: keep the server default */
    }
  }, []);

  const setSource = useCallback((next: SourceChoice) => {
    setSourceState(next);
    try {
      localStorage.setItem(KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  return { source, setSource };
}
