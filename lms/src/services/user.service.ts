/**
 * User & profile service.
 *
 * `toSafeUser` is the single serializer for user data that leaves the server:
 * no password hashes, no internal session data.
 */
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { profiles, users } from "@/db/schema";
import { NotFoundError } from "@/lib/errors";
import type { SafeUser } from "@/types";

type UserRow = typeof users.$inferSelect;
type ProfileRow = typeof profiles.$inferSelect;

export function toSafeUser(user: UserRow, profile?: ProfileRow | null): SafeUser {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    role: user.role,
    firstName: profile?.firstName ?? "",
    lastName: profile?.lastName ?? "",
    phone: profile?.phone ?? null,
    country: profile?.country ?? null,
    bio: profile?.bio ?? null,
    timezone: profile?.timezone ?? null,
    avatarUrl: profile?.avatarUrl ?? null,
    createdAt: user.createdAt,
  };
}

export async function getSafeUserById(id: string): Promise<SafeUser | null> {
  const db = await getDb();
  const rows = await db
    .select({ user: users, profile: profiles })
    .from(users)
    .leftJoin(profiles, eq(profiles.userId, users.id))
    .where(eq(users.id, id))
    .limit(1);
  if (!rows[0]) return null;
  return toSafeUser(rows[0].user, rows[0].profile);
}

/** Self-service profile update. Caller must have established it is the owner. */
export async function updateProfile(
  userId: string,
  input: { firstName: string; lastName: string; phone?: string; country?: string; bio?: string; timezone?: string },
): Promise<SafeUser> {
  const db = await getDb();
  await db
    .update(profiles)
    .set({
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone || null,
      country: input.country || null,
      bio: input.bio || null,
      timezone: input.timezone || null,
      updatedAt: new Date(),
    })
    .where(eq(profiles.userId, userId));
  const updated = await getSafeUserById(userId);
  if (!updated) throw new NotFoundError("User not found.");
  return updated;
}

export interface UserListFilter {
  q?: string;
  role?: "student" | "instructor" | "admin";
  page: number;
  perPage: number;
}

export interface UserListRow {
  user: SafeUser;
  isActive: boolean;
}

/** Admin: paginated user directory with search + role filter. */
export async function listUsers(filter: UserListFilter): Promise<{ rows: UserListRow[]; total: number }> {
  const db = await getDb();
  const where = and(
    filter.role ? eq(users.role, filter.role) : undefined,
    filter.q
      ? or(ilike(users.email, `%${filter.q}%`), ilike(users.username, `%${filter.q}%`), ilike(profiles.firstName, `%${filter.q}%`), ilike(profiles.lastName, `%${filter.q}%`))
      : undefined,
  );

  const [countRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(users)
    .leftJoin(profiles, eq(profiles.userId, users.id))
    .where(where)
    .limit(1);

  const rows = await db
    .select({ user: users, profile: profiles })
    .from(users)
    .leftJoin(profiles, eq(profiles.userId, users.id))
    .where(where)
    .orderBy(desc(users.createdAt))
    .limit(filter.perPage)
    .offset((filter.page - 1) * filter.perPage);

  return {
    rows: rows.map((r) => ({ user: toSafeUser(r.user, r.profile), isActive: r.user.isActive })),
    total: countRow?.count ?? 0,
  };
}

/** Admin: count users per role (dashboard tiles). */
export async function countUsersByRole(): Promise<Record<"student" | "instructor" | "admin", number>> {
  const db = await getDb();
  const rows = await db.select({ role: users.role, count: sql<number>`count(*)::int` }).from(users).groupBy(users.role);
  const out: Record<"student" | "instructor" | "admin", number> = { student: 0, instructor: 0, admin: 0 };
  for (const r of rows) out[r.role] = r.count;
  return out;
}
