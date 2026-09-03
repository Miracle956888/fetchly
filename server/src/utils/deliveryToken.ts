import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '../config/env.js';

/**
 * Signed, short-lived tokens for file delivery.
 * Token format: "<expiresAtMs>.<base64url(hmac-sha256(jobId.expiresAtMs))>"
 * The client only ever receives the token; real file paths never leave the
 * server, and a token cannot be reused for another job.
 */

const TOKEN_TTL_MS = 10 * 60_000;

function sign(payload: string): string {
  return createHmac('sha256', env.JWT_SECRET).update(payload).digest('base64url');
}

export function signDeliveryToken(jobId: string, now = Date.now()): { token: string; expiresAt: number } {
  const expiresAt = now + TOKEN_TTL_MS;
  const payload = `${jobId}.${expiresAt}`;
  return { token: `${expiresAt}.${sign(payload)}`, expiresAt };
}

export function verifyDeliveryToken(jobId: string, token: unknown, now = Date.now()): boolean {
  if (typeof token !== 'string' || !/^\d+\.[A-Za-z0-9_-]+$/.test(token)) return false;
  const [expiryStr, sig] = token.split('.');
  const expiresAt = Number(expiryStr);
  if (!Number.isFinite(expiresAt) || expiresAt < now) return false;
  const expected = sign(`${jobId}.${expiresAt}`);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
