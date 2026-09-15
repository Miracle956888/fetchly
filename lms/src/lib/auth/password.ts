import { hash, verify } from "@node-rs/argon2";

/**
 * Password policy. Enforced client-side (fast feedback) and server-side
 * (authoritative). Kept in one module so both layers share the same rules.
 */
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;

export function passwordPolicyError(password: string): string | null {
  if (password.length < PASSWORD_MIN) return `Password must be at least ${PASSWORD_MIN} characters.`;
  if (password.length > PASSWORD_MAX) return `Password must be at most ${PASSWORD_MAX} characters.`;
  if (!/[A-Z]/.test(password)) return "Password must contain at least one uppercase letter.";
  if (!/[a-z]/.test(password)) return "Password must contain at least one lowercase letter.";
  if (!/\d/.test(password)) return "Password must contain at least one number.";
  return null;
}

// Argon2id parameters (OWASP-recommended minimums for Argon2id, 64 KiB memory).
const ARGON2 = {
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 2,
} as const;

export function hashPassword(password: string): Promise<string> {
  return hash(password, ARGON2);
}

export function verifyPassword(password: string, hashValue: string): Promise<boolean> {
  return verify(hashValue, password, ARGON2).catch(() => false);
}
