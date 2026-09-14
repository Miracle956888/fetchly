import type { NextFunction, Request, Response } from 'express';
import { allowedOrigins } from '../config/env.js';
import { ApiError } from '../utils/errors.js';

const STATE_CHANGING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * CSRF guard.
 *
 * CORS alone does not stop CSRF: a cross-origin *simple* request (for example a
 * hidden HTML form posting to `/api/v1/admin/jobs/:id/cancel`, which needs no
 * body) is executed by the browser with the user's cookies attached — CORS only
 * hides the response. Requests that need `Content-Type: application/json` are
 * preflighted and therefore blocked, but the body-less admin mutations are not.
 *
 * SameSite=strict already closes this for same-site deployments. This check
 * keeps it closed when an operator relaxes the cookie to `lax`/`none` for a
 * cross-origin frontend: browsers always send `Origin` on cross-origin
 * POST/PUT/PATCH/DELETE, so an Origin outside the allow-list is rejected.
 *
 * Non-browser clients (curl, health checks, server-to-server) send no Origin
 * and are unaffected — they also carry no ambient cookie to abuse.
 */
function hostOf(value: string): string | null {
  try {
    return new URL(value).host.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * The host the request is addressed to, including any port, as seen through
 * the reverse proxy. `req.hostname` strips the port, which would wrongly split
 * `http://host:4173` from `host:4173`; Same-Origin is port-sensitive, so the
 * comparison must keep it.
 */
function effectiveHost(req: Request): string {
  const fwd = req.headers['x-forwarded-host'];
  const raw = (Array.isArray(fwd) ? fwd[0] : fwd) ?? req.headers.host ?? '';
  return raw.split(',')[0].trim().toLowerCase();
}

export function originGuard(req: Request, _res: Response, next: NextFunction): void {
  if (!STATE_CHANGING.has(req.method)) return next();

  const origin = req.headers.origin;
  if (!origin) return next();

  // Same-origin through a reverse proxy: the page that issued the request is
  // served by the very host the request is addressed to (nginx / Vite proxy
  // forward the public host via Host or X-Forwarded-Host). A CSRF attack is
  // cross-site by definition, so this can never be the attacker's origin.
  const originHost = hostOf(origin);
  if (originHost && originHost === effectiveHost(req)) return next();

  // Explicitly configured frontend origins (CLIENT_URL / CORS_ORIGINS).
  if (allowedOrigins.some((o) => hostOf(o) === originHost)) return next();

  // A browser-initiated cross-site write to a cookie-authenticated endpoint.
  next(ApiError.forbidden('Cross-origin request blocked.'));
}
