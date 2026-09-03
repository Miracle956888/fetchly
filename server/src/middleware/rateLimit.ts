import type { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';
import { errorBody } from '../utils/errors.js';

const handler = (_req: Request, res: Response): void => {
  res.status(429).json(errorBody('RATE_LIMITED', 'Too many requests. Please slow down and try again shortly.'));
};

/** Global API limiter (per IP). */
export const apiLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler,
  // Job-status polling and token-protected file delivery are excluded here —
  // a legitimate user watching one download would otherwise exhaust the
  // global budget with poll requests alone. Both routes get the lenient
  // limiter below instead; they are read-only and gated by unguessable job
  // UUIDs (status) or signed tokens (file).
  skip: (req) =>
    req.method === 'GET' && /^\/downloads\/[^/]+(\/file)?$/.test(req.path),
});

/** Lenient limiter for progress polling + file delivery. */
export const pollingLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.RATE_LIMIT_MAX_REQUESTS * 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler,
});

/** Stricter limiter for the expensive analyze endpoint. */
export const analyzeLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.ANALYZE_LIMIT_MAX_REQUESTS,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler,
});

/** Brute-force protection for admin login. */
export const loginLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.LOGIN_LIMIT_MAX_REQUESTS,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler,
});
