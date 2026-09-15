// NOTE: this module must stay isomorphic (client components import it).
// Node-only crypto helpers live in `@/lib/crypto`.

/** Stable, URL-safe slug from arbitrary text. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 80)
    || "item";
}

/**
 * Sanitize a post-login "next" redirect. Only same-origin absolute paths are
 * allowed; anything else returns null (caller picks a default).
 */
export function safeNextPath(value: string | null | undefined): string | null {
  if (!value) return null;
  if (!value.startsWith("/") || value.startsWith("//")) return null;
  if (value.includes("\0")) return null;
  return value;
}

/** Round a percentage to a whole number, clamped to 0..100. */
export function clampPercent(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((numerator / denominator) * 100)));
}

/** Deterministic initials for avatar fallbacks ("Sam Rivera" → "SR"). */
export function initials(first: string, last: string): string {
  const a = first.trim().charAt(0);
  const b = last.trim().charAt(0);
  return ((a || "") + (b || "")).toUpperCase() || "?";
}

/**
 * Role-specific home after authentication.
 * Students land in the student portal, etc.
 */
export function roleHome(role: "student" | "instructor" | "admin"): string {
  switch (role) {
    case "instructor":
      return "/instructor";
    case "admin":
      return "/admin";
    default:
      return "/student";
  }
}

/** Format an ISO date for UI copy (e.g. "Jan 12, 2026"). */
export function formatDate(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}
