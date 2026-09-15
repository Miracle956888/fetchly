import { describe, expect, it } from "vitest";
import {
  loginSchema,
  progressUpdateSchema,
  registerSchema,
} from "@/lib/validation/schemas";

describe("registerSchema", () => {
  const valid = {
    fullName: "Sam Rivera",
    username: "sam_rivera",
    email: "sam@example.com",
    password: "CorrectHorse9",
    phone: "",
    country: "",
  };

  it("accepts a valid registration", () => {
    expect(registerSchema.safeParse(valid).success).toBe(true);
  });

  it("normalizes email to lowercase", () => {
    const r = registerSchema.parse({ ...valid, email: "Sam@Example.COM" });
    expect(r.email).toBe("sam@example.com");
  });

  it("rejects an invalid username", () => {
    expect(registerSchema.safeParse({ ...valid, username: "a" }).success).toBe(false);
    expect(registerSchema.safeParse({ ...valid, username: "bad name!" }).success).toBe(false);
  });

  it("rejects a weak password", () => {
    expect(registerSchema.safeParse({ ...valid, password: "short" }).success).toBe(false);
    expect(registerSchema.safeParse({ ...valid, password: "alllowercase1" }).success).toBe(false);
  });

  it("rejects an invalid email", () => {
    expect(registerSchema.safeParse({ ...valid, email: "not-an-email" }).success).toBe(false);
  });

  it("rejects a malformed full name", () => {
    expect(registerSchema.safeParse({ ...valid, fullName: "123" }).success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("accepts email or username identifier", () => {
    expect(loginSchema.safeParse({ identifier: "sam@example.com", password: "x" }).success).toBe(true);
    expect(loginSchema.safeParse({ identifier: "sam_rivera", password: "x" }).success).toBe(true);
  });

  it("requires a non-empty identifier and password", () => {
    expect(loginSchema.safeParse({ identifier: "", password: "x" }).success).toBe(false);
    expect(loginSchema.safeParse({ identifier: "sam", password: "" }).success).toBe(false);
  });

  it("caps the next redirect length", () => {
    expect(loginSchema.safeParse({ identifier: "a@b.co", password: "x", next: "a".repeat(501) }).success).toBe(false);
  });
});

describe("progressUpdateSchema", () => {
  it("accepts marking a lesson complete", () => {
    expect(progressUpdateSchema.safeParse({ lessonId: "0a1b2c3d-0000-4000-8000-000000000000", completed: true }).success).toBe(true);
  });

  it("rejects an invalid lesson id", () => {
    expect(progressUpdateSchema.safeParse({ lessonId: "nope", completed: true }).success).toBe(false);
  });

  it("rejects un-completing (phase 01 only supports completion)", () => {
    const r = progressUpdateSchema.safeParse({ lessonId: "0a1b2c3d-0000-4000-8000-000000000000", completed: false });
    expect(r.success).toBe(false);
  });
});
