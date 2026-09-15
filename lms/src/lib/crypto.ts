/**
 * Server-only cryptographic helpers.
 *
 * Kept separate from `utils.ts` (which must stay isomorphic — client
 * components import it) because `node:crypto` cannot be bundled for the
 * browser.
 */
import { createHash, randomBytes } from "node:crypto";

/** SHA-256 hex digest. Used for session/reset tokens (only the hash is stored). */
export function sha256Hex(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

/** Cryptographically random opaque token (hex). */
export function randomToken(bytes = 48): string {
  return randomBytes(bytes).toString("hex");
}
