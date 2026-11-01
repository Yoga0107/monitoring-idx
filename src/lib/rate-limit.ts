/**
 * Minimal fixed-window rate limiter kept in memory. On Vercel each serverless instance has its own
 * counters, so this is a best-effort guard for the free AI quota, not a hard guarantee.
 */
const windows = new Map<string, { count: number; resetAt: number }>();

export function hitLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfterSec: number } {
  const now = Date.now();
  if (windows.size > 500) for (const [k, w] of windows) if (w.resetAt <= now) windows.delete(k);
  const w = windows.get(key);
  if (!w || w.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSec: 0 };
  }
  if (w.count >= limit) return { ok: false, retryAfterSec: Math.ceil((w.resetAt - now) / 1000) };
  w.count += 1;
  return { ok: true, retryAfterSec: 0 };
}
