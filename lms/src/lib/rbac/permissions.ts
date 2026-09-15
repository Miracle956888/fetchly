/**
 * Permission catalog & role → permission mapping.
 *
 * The catalog is the single source of truth for what each role may do.
 * Route guards (lib/auth/guards.ts) enforce *which* area a user may enter;
 * service-layer policies (lib/rbac/policies.ts) enforce *row-scoped* rules
 * (e.g. an instructor may only see students of their own courses).
 */
import type { Role } from "@/lib/auth/guards";

export type Permission =
  | "course:read:public"
  | "course:manage"
  | "category:read:public"
  | "category:manage"
  | "enrollment:read:own"
  | "enrollment:create:own"
  | "enrollment:read:course" // instructor: students in assigned courses
  | "enrollment:read:all" // admin
  | "progress:write:own"
  | "progress:read:own"
  | "progress:read:course" // instructor: progress of students in assigned courses
  | "quiz:take:enrolled"
  | "quiz:read:own-attempts"
  | "quiz:read:course"
  | "user:manage"
  | "user:read:all"
  | "certificate:read:own"
  | "certificate:read:all"
  | "notification:read:own"
  | "platform:settings"
  | "platform:activity";

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  student: [
    "course:read:public",
    "category:read:public",
    "enrollment:read:own",
    "enrollment:create:own",
    "progress:write:own",
    "progress:read:own",
    "quiz:take:enrolled",
    "quiz:read:own-attempts",
    "certificate:read:own",
    "notification:read:own",
  ],
  instructor: [
    "course:read:public",
    "category:read:public",
    "course:manage", // scoped to assigned courses in policies
    "enrollment:read:course",
    "progress:read:course",
    "quiz:read:course",
    "notification:read:own",
  ],
  admin: [
    "course:read:public",
    "course:manage",
    "category:read:public",
    "category:manage",
    "enrollment:read:all",
    "enrollment:create:own",
    "progress:read:own",
    "progress:read:course",
    "progress:write:own",
    "quiz:read:course",
    "quiz:take:enrolled",
    "quiz:read:own-attempts",
    "user:manage",
    "user:read:all",
    "certificate:read:own",
    "certificate:read:all",
    "notification:read:own",
    "platform:settings",
    "platform:activity",
  ],
};

/** Pure check: does the role carry the permission? */
export function roleHasPermission(role: Role, permission: Permission): boolean {
  const perms = ROLE_PERMISSIONS[role];
  return perms ? perms.includes(permission) : false;
}
