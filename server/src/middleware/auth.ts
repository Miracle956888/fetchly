import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { ApiError } from '../utils/errors.js';

export const ADMIN_COOKIE = 'fetchly_admin';

export interface AdminClaims {
  sub: string;
  email: string;
  role: 'USER' | 'ADMIN';
}

export function signAdminToken(claims: AdminClaims): string {
  return jwt.sign(claims, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN } as jwt.SignOptions);
}

/**
 * Server-side authorization gate. Every admin route is wrapped with this —
 * the frontend's route protection is UX only, never security.
 */
export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  const cookieToken = (req.cookies as Record<string, string> | undefined)?.[ADMIN_COOKIE];
  const token = header?.startsWith('Bearer ') ? header.slice(7) : cookieToken;
  if (!token) return next(ApiError.unauthorized());
  try {
    const claims = jwt.verify(token, env.JWT_SECRET) as AdminClaims;
    if (claims.role !== 'ADMIN') return next(ApiError.forbidden());
    (req as Request & { admin?: AdminClaims }).admin = claims;
    next();
  } catch {
    next(ApiError.unauthorized('Your session has expired. Please sign in again.'));
  }
}
