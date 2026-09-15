/**
 * Authentication service: registration, login, logout, password change and
 * password reset. Owns all credential logic; the API layer only orchestrates.
 */
import { and, eq, isNull, or } from "drizzle-orm";
import { getDb } from "@/db/client";
import { activityRecords, passwordResets, profiles, sessions, users } from "@/db/schema";
import { AppError, ConflictError, NotFoundError } from "@/lib/errors";
import { hashPassword, passwordPolicyError, verifyPassword } from "@/lib/auth/password";
import { randomToken, sha256Hex } from "@/lib/crypto";
import type { LoginInput, RegisterInput } from "@/lib/validation/schemas";
import { createSession } from "@/lib/auth/session";

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

interface RequestMeta {
  userAgent?: string | null;
  ip?: string;
}

export interface RegisterResult {
  userId: string;
  token: string;
}

export async function register(input: RegisterInput, meta: RequestMeta = {}): Promise<RegisterResult> {
  const db = await getDb();
  const email = input.email.toLowerCase();
  const username = input.username;

  const policyError = passwordPolicyError(input.password);
  if (policyError) throw new AppError(422, "VALIDATION_ERROR", policyError);

  const [existing] = await db
    .select({ email: users.email, username: users.username })
    .from(users)
    .where(or(eq(users.email, email), eq(users.username, username)))
    .limit(1);
  if (existing?.email === email) throw new ConflictError("An account with this email already exists.");
  if (existing?.username === username) throw new ConflictError("This username is already taken.");

  const passwordHash = await hashPassword(input.password);

  const [created] = await db.transaction(async (tx) => {
    const [user] = await tx.insert(users).values({ email, username, passwordHash, role: "student" }).returning();
    await tx.insert(profiles).values({
      userId: user.id,
      firstName: splitName(input.fullName, 0),
      lastName: splitName(input.fullName, 1),
      phone: input.phone || null,
      country: input.country || null,
    });
    await tx.insert(activityRecords).values({
      userId: user.id,
      type: "user_registered",
      entityType: "user",
      entityId: user.id,
    });
    return [user] as const;
  });

  const token = await createSession(created.id, { userAgent: meta.userAgent ?? undefined, ip: meta.ip });
  return { userId: created.id, token };
}

/** Split "Sam Rivera" into ["Sam", "Rivera"]; single names get "" as second part. */
function splitName(fullName: string, part: 0 | 1): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return part === 0 ? parts[0] : "";
  return part === 0 ? parts[0] : parts.slice(1).join(" ");
}

export interface LoginResult {
  token: string;
  role: "student" | "instructor" | "admin";
}

export async function login(input: LoginInput, meta: RequestMeta = {}): Promise<LoginResult> {
  const db = await getDb();
  const identifier = input.identifier.trim().toLowerCase();

  const [user] = await db
    .select()
    .from(users)
    .where(or(eq(users.email, identifier), eq(users.username, identifier)))
    .limit(1);

  // Uniform message for unknown user vs wrong password (no account enumeration).
  if (!user) throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email/username or password.");
  if (!user.isActive) throw new AppError(403, "ACCOUNT_DISABLED", "This account has been disabled. Contact support.");

  const valid = await verifyPassword(input.password, user.passwordHash);
  if (!valid) throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email/username or password.");

  const token = await createSession(user.id, { userAgent: meta.userAgent ?? undefined, ip: meta.ip });
  return { token, role: user.role };
}

export async function logout(token: string): Promise<void> {
  const db = await getDb();
  await db
    .update(sessions)
    .set({ revokedAt: new Date() })
    .where(and(eq(sessions.tokenHash, sha256Hex(token)), isNull(sessions.revokedAt)));
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
  const db = await getDb();
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) throw new NotFoundError("User not found.");

  const valid = await verifyPassword(currentPassword, user.passwordHash);
  if (!valid) throw new AppError(401, "INVALID_CREDENTIALS", "Current password is incorrect.");

  const policyError = passwordPolicyError(newPassword);
  if (policyError) throw new AppError(422, "VALIDATION_ERROR", policyError);

  await db
    .update(users)
    .set({ passwordHash: await hashPassword(newPassword), updatedAt: new Date() })
    .where(eq(users.id, userId));

  // Revoke all sessions: a password change is a privilege-boundary event.
  await db
    .update(sessions)
    .set({ revokedAt: new Date() })
    .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt)));
}

/**
 * Password reset (phase 01 scope):
 *  - request: always responds identically (no account enumeration). If the
 *    account exists, a single-use 1h token is created. In development the
 *    reset link is logged to the server console (no mail provider yet); in
 *    production this is where the email provider is wired (phase 02).
 */
export async function requestPasswordReset(email: string): Promise<{ devLink?: string }> {
  const db = await getDb();
  const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
  if (!user) return {}; // identical response to success — intentional

  const token = randomToken(32);
  await db.insert(passwordResets).values({
    userId: user.id,
    tokenHash: sha256Hex(token),
    expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
  });

  if (process.env.NODE_ENV !== "production") {
    console.info(`[auth] dev password-reset created for ${user.email}: /reset-password?token=${token}`);
    return { devLink: `/reset-password?token=${token}` };
  }
  return {};
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const db = await getDb();
  const policyError = passwordPolicyError(newPassword);
  if (policyError) throw new AppError(422, "VALIDATION_ERROR", policyError);

  const rows = await db
    .select()
    .from(passwordResets)
    .where(eq(passwordResets.tokenHash, sha256Hex(token)))
    .orderBy(passwordResets.createdAt)
    .limit(1);
  const latest = rows[rows.length - 1];
  if (!latest || latest.usedAt || latest.expiresAt.getTime() < Date.now()) {
    throw new AppError(400, "INVALID_RESET_TOKEN", "This reset link is invalid or has expired.");
  }

  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({ passwordHash: await hashPassword(newPassword), updatedAt: new Date() })
      .where(eq(users.id, latest.userId));
    await tx.update(passwordResets).set({ usedAt: new Date() }).where(eq(passwordResets.id, latest.id));
    // Revoke all sessions for the account (the token could have leaked).
    await tx
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(and(eq(sessions.userId, latest.userId), isNull(sessions.revokedAt)));
  });
}
