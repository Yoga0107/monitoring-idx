"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface State<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  refreshing: boolean;
}

/**
 * Fetches JSON, optionally re-polling while the tab is visible.
 * Keeps the last good data when a refresh fails (the UI can show a stale warning).
 * Pass `url = null` to disable. `intervalMs = 0` disables polling.
 */
export function usePolledJson<T>(url: string | null, intervalMs: number) {
  const [state, setState] = useState<State<T>>({ data: null, error: null, loading: !!url, refreshing: false });
  const [tick, setTick] = useState(0);
  const lastUrl = useRef<string | null>(null);

  useEffect(() => {
    if (!url) return;
    const controller = new AbortController();
    const urlChanged = lastUrl.current !== url;
    lastUrl.current = url;

    setState((s) => (urlChanged ? { data: null, error: null, loading: true, refreshing: false } : { ...s, refreshing: true }));

    (async () => {
      try {
        const res = await fetch(url, { signal: controller.signal, cache: "no-store" });
        const json = await res.json().catch(() => null);
        if (!res.ok) throw new Error(json?.error?.message ?? `Request failed (${res.status})`);
        setState({ data: json as T, error: null, loading: false, refreshing: false });
      } catch (e) {
        if (controller.signal.aborted) return;
        setState((s) => ({ ...s, error: e instanceof Error ? e.message : "Request failed", loading: false, refreshing: false }));
      }
    })();

    return () => controller.abort();
  }, [url, tick]);

  useEffect(() => {
    if (!url || !intervalMs) return;
    const id = setInterval(() => {
      if (document.visibilityState === "visible") setTick((t) => t + 1);
    }, intervalMs);
    return () => clearInterval(id);
  }, [url, intervalMs]);

  const refresh = useCallback(() => setTick((t) => t + 1), []);
  return { ...state, refresh };
}
