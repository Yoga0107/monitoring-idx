/**
 * Tiny in-memory TTL cache with in-flight request de-duplication.
 * On Vercel each serverless instance has its own memory, so this is a
 * best-effort layer; the route handlers also send `s-maxage` so Vercel's
 * CDN does the heavy lifting.
 */
interface Entry<T> {
  value: T;
  expiresAt: number;
}

const store = new Map<string, Entry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

export async function cached<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>,
): Promise<{ value: T; hit: boolean }> {
  const now = Date.now();
  const entry = store.get(key) as Entry<T> | undefined;
  if (entry && entry.expiresAt > now) return { value: entry.value, hit: true };

  const pending = inflight.get(key) as Promise<T> | undefined;
  if (pending) return { value: await pending, hit: false };

  const promise = loader()
    .then((value) => {
      if (store.size >= 200) {
        const t = Date.now();
        for (const [k, e] of store) if (e.expiresAt <= t) store.delete(k);
      }
      store.set(key, { value, expiresAt: Date.now() + ttlMs });
      return value;
    })
    .finally(() => inflight.delete(key));
  inflight.set(key, promise);
  return { value: await promise, hit: false };
}
