/**
 * Route & API authorization guards.
 *
 * UI guards (server components): redirect unauthenticated users to /login
 * (remembering where they were headed) and wrong-role users to the portal
 * that matches their account.
 * API guards: throw typed AppErrors mapped to 401/403 JSON.
 *
 * Authorization is ALWAYS enforced server-side. Hiding buttons in the UI is
 * presentation only — these guards plus the service-layer checks are the
 * real enforcement.
 */
import { redirect } from "next/navigation";
import { ForbiddenError, UnauthorizedError } from "@/lib/errors";
import { roleHome } from "@/lib/utils";
import { getSessionContext, type SessionContext, type SessionUser } from "./session";

export type Role = SessionUser["role"];

export async function getOptionalSession(): Promise<SessionContext | null> {
  return getSessionContext();
}

/**
 * Server-component guard: requires any authenticated user.
 * @param from the portal base path to return to after login (e.g. "/student").
 */
export async function requireUser(from?: string): Promise<SessionContext> {
  const ctx = await getSessionContext();
  if (!ctx) redirect(`/login?next=${encodeURIComponent(from ?? "/")}`);
  return ctx;
}

/**
 * Server-component guard: requires one of the given roles.
 * Unauthenticated → /login; authenticated but wrong role → their own portal.
 */
export async function requireRole(roles: Role[], from?: string): Promise<SessionContext> {
  const ctx = await getSessionContext();
  if (!ctx) redirect(`/login?next=${encodeURIComponent(from ?? "/")}`);
  if (!roles.includes(ctx.user.role)) redirect(roleHome(ctx.user.role));
  return ctx;
}

/** API guard: requires any authenticated user (throws 401). */
export async function requireApiUser(): Promise<SessionUser> {
  const ctx = await getSessionContext();
  if (!ctx) throw new UnauthorizedError();
  return ctx.user;
}

/** API guard: requires one of the given roles (throws 401/403). */
export async function requireApiRole(roles: Role[]): Promise<SessionUser> {
  const user = await requireApiUser();
  if (!roles.includes(user.role)) throw new ForbiddenError();
  return user;
}
