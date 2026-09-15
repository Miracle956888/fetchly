import { describe, expect, it } from "vitest";
import { hashPassword, passwordPolicyError, verifyPassword } from "@/lib/auth/password";

describe("passwordPolicyError", () => {
  it("accepts a strong password", () => {
    expect(passwordPolicyError("CorrectHorse9")).toBeNull();
    expect(passwordPolicyError("Dev-2026!")).toBeNull();
  });

  it("rejects short passwords", () => {
    expect(passwordPolicyError("Ab1")).not.toBeNull();
  });

  it("rejects missing character classes", () => {
    expect(passwordPolicyError("alllowercase1")).not.toBeNull(); // no uppercase
    expect(passwordPolicyError("ALLUPPERCASE1")).not.toBeNull(); // no lowercase
    expect(passwordPolicyError("NoDigitsHere")).not.toBeNull(); // no number
  });
});

describe("argon2 hash/verify roundtrip", () => {
  it("hashes to an argon2id string and verifies", async () => {
    const hash = await hashPassword("CorrectHorse9");
    expect(hash).toContain("$argon2id$");
    expect(await verifyPassword("CorrectHorse9", hash)).toBe(true);
    expect(await verifyPassword("WrongPassword1", hash)).toBe(false);
  });

  it("produces unique hashes (per-hash salt)", async () => {
    const a = await hashPassword("SamePassword1");
    const b = await hashPassword("SamePassword1");
    expect(a).not.toBe(b);
    // but both verify against the same plaintext
    expect(await verifyPassword("SamePassword1", a)).toBe(true);
    expect(await verifyPassword("SamePassword1", b)).toBe(true);
  });
});
