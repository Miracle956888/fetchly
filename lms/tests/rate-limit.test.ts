import { afterEach, describe, expect, it } from "vitest";
import { assertNotRateLimited, hit, _resetRateLimitStore } from "@/lib/auth/rate-limit";
import { RateLimitError } from "@/lib/errors";

describe("sliding-window rate limiter", () => {
  afterEach(() => _resetRateLimitStore());

  it("allows up to the limit within the window", () => {
    for (let i = 0; i < 3; i++) {
      expect(hit("k", 3, 60_000).ok).toBe(true);
    }
    // the 4th hit exceeds the limit of 3
    const over = hit("k", 3, 60_000);
    expect(over.ok).toBe(false);
    expect(over.retryAfterSeconds).toBeGreaterThanOrEqual(1);
    expect(over.retryAfterSeconds).toBeLessThanOrEqual(60);
  });

  it("tracks keys independently", () => {
    expect(hit("a", 1, 60_000).ok).toBe(true);
    expect(hit("a", 1, 60_000).ok).toBe(false);
    // a different key is unaffected
    expect(hit("b", 1, 60_000).ok).toBe(true);
  });

  it("assertNotRateLimited throws RateLimitError with retry-after", () => {
    hit("x", 2, 60_000);
    hit("x", 2, 60_000);
    expect(() => assertNotRateLimited("x", 2, 60_000)).toThrow(RateLimitError);
  });

  it("RateLimitError carries retryAfterSeconds and 429 metadata", () => {
    _resetRateLimitStore();
    const err = (() => {
      hit("y", 1, 60_000);
      try {
        assertNotRateLimited("y", 1, 60_000);
        return null;
      } catch (e) {
        return e as RateLimitError;
      }
    })();
    expect(err).toBeInstanceOf(RateLimitError);
    if (err) {
      expect(err.statusCode).toBe(429);
      expect(err.code).toBe("RATE_LIMITED");
      expect(err.retryAfterSeconds).toBeGreaterThanOrEqual(1);
    }
  });
});
