/**
 * Session foundation.
 *
 * - Opaque random tokens (96 hex chars); only their SHA-256 hash is stored.
 * - Delivered via an HttpOnly, SameSite=Lax cookie (Secure in production).
 * - Fixed 30-day lifetime, sliding: refreshed to 30 days on activity when the
 *   remaining life drops below 14 days.
 * - Server-side only — no secrets or session logic ever reach the client.
 */
import { cookies } from "next/headers";
import { eq, and, isNull, gte } from "drizzle-orm";
import { getDb } from "@/db/client";
import { sessions, users, profiles } from "@/db/schema";
import { randomToken, sha256Hex } from "@/lib/crypto";

export const SESSION_COOKIE = "lms_session";
export const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const SLIDE_THRESHOLD_MS = 14 * 24 * 60 * 60 * 1000; // refresh when < 14 days left

export interface SessionUser {
  id: string;
  email: string;
  username: string;
  role: "student" | "instructor" | "admin";
  firstName: string;
  lastName: string;
  phone: string | null;
  country: string | null;
  bio: string | null;
  timezone: string | null;
  avatarUrl: string | null;
  createdAt: Date;
}

export interface SessionContext {
  user: SessionUser;
  sessionId: string;
}

export interface CookieOptions {
  name: string;
  value?: string;
  maxAge?: number;
  expires?: Date;
  path?: string;
  domain?: string;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: "lax" | "strict" | "none";
}

export async function createSession(userId: string, meta?: { userAgent?: string; ip?: string }): Promise<string> {
  const db = await getDb();
  const token = randomToken(48);
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_MS);
  await db.insert(sessions).values({
    tokenHash: sha256Hex(token),
    userId,
    userAgent: meta?.userAgent ?? null,
    ipAddress: meta?.ip ?? null,
    expiresAt,
    lastSeenAt: new Date(),
  });
  return token;
}

export async function revokeSession(token: string): Promise<void> {
  const db = await getDb();
  await db
    .update(sessions)
    .set({ revokedAt: new Date() })
    .where(and(eq(sessions.tokenHash, sha256Hex(token)), isNull(sessions.revokedAt)));
}

export function sessionCookieOptions(value: string): CookieOptions {
  return {
    name: SESSION_COOKIE,
    value,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(Date.now() + SESSION_MAX_AGE_MS),
  };
}

export function clearSessionCookieOptions(): CookieOptions {
  return { name: SESSION_COOKIE, value: "", httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 };
}

/**
 * Resolve the current session for a server request (RSC or route handler).
 * Returns null when there is no valid, unexpired, non-revoked session.
 */
export async function getSessionContext(): Promise<SessionContext | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const db = await getDb();
  const [session] = await db
    .select({
      sessionId: sessions.id,
      userId: sessions.userId,
      expiresAt: sessions.expiresAt,
      revokedAt: sessions.revokedAt,
    })
    .from(sessions)
    .where(eq(sessions.tokenHash, sha256Hex(token)))
    .limit(1);

  if (!session || session.revokedAt || session.expiresAt.getTime() < Date.now()) return null;

  const [row] = await db
    .select({
      id: users.id,
      email: users.email,
      username: users.username,
      role: users.role,
      isActive: users.isActive,
      createdAt: users.createdAt,
      firstName: profiles.firstName,
      lastName: profiles.lastName,
      phone: profiles.phone,
      country: profiles.country,
      bio: profiles.bio,
      timezone: profiles.timezone,
      avatarUrl: profiles.avatarUrl,
    })
    .from(users)
    .innerJoin(profiles, eq(profiles.userId, users.id))
    .where(and(eq(users.id, session.userId), gte(users.isActive, true)))
    .limit(1);

  if (!row) return null;

  // Sliding expiration: keep long-lived sessions alive under active use.
  const remaining = session.expiresAt.getTime() - Date.now();
  if (remaining < SLIDE_THRESHOLD_MS) {
    await db
      .update(sessions)
      .set({ expiresAt: new Date(Date.now() + SESSION_MAX_AGE_MS), lastSeenAt: new Date() })
      .where(eq(sessions.id, session.sessionId));
  }

  return {
    user: {
      id: row.id,
      email: row.email,
      username: row.username,
      role: row.role,
      firstName: row.firstName,
      lastName: row.lastName,
      phone: row.phone,
      country: row.country,
      bio: row.bio,
      timezone: row.timezone,
      avatarUrl: row.avatarUrl,
      createdAt: row.createdAt,
    },
    sessionId: session.sessionId,
  };
}
