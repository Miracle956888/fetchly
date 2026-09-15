/**
 * In-memory sliding-window rate limiter for authentication-adjacent endpoints.
 *
 * Development/single-instance foundation. For multi-instance production the
 * same interface should be backed by Redis (see docs/ARCHITECTURE.md).
 */
import { RateLimitError } from "@/lib/errors";

interface WindowEntry {
  hits: number[]; // timestamps (ms)
}

const store = new Map<string, WindowEntry>();
const PRUNE_INTERVAL_MS = 5 * 60 * 1000;
let lastPrune = Date.now();

export interface RateLimitResult {
  ok: boolean;
  retryAfterSeconds: number;
}

/**
 * Record a hit for `key` and report whether the limit was exceeded.
 * @param key      e.g. "login:1.2.3.4"
 * @param limit    max hits inside the window
 * @param windowMs window size in ms
 */
export function hit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  if (now - lastPrune > PRUNE_INTERVAL_MS) {
    lastPrune = now;
    for (const [k, v] of store) {
      const fresh = v.hits.filter((t) => now - t < windowMs);
      if (fresh.length === 0) store.delete(k);
      else v.hits = fresh;
    }
  }

  let entry = store.get(key);
  if (!entry) {
    entry = { hits: [] };
    store.set(key, entry);
  }
  entry.hits = entry.hits.filter((t) => now - t < windowMs);
  entry.hits.push(now);

  if (entry.hits.length > limit) {
    const excessStart = entry.hits.length - limit;
    const oldestExcess = entry.hits[excessStart];
    const retryAfterSeconds = Math.max(1, Math.ceil((oldestExcess + windowMs - now) / 1000));
    return { ok: false, retryAfterSeconds };
  }
  return { ok: true, retryAfterSeconds: 0 };
}

/** Assert a hit is allowed or throw a RateLimitError with retry-after. */
export function assertNotRateLimited(key: string, limit: number, windowMs: number): void {
  const result = hit(key, limit, windowMs);
  if (!result.ok) throw new RateLimitError(result.retryAfterSeconds);
}

/** Test helper. */
export function _resetRateLimitStore(): void {
  store.clear();
  lastPrune = Date.now();
}
