import { describe, expect, it } from "vitest";
import { randomToken, sha256Hex } from "@/lib/crypto";
import {
  clampPercent,
  initials,
  roleHome,
  safeNextPath,
  slugify,
} from "@/lib/utils";

describe("safeNextPath (open-redirect prevention)", () => {
  it("accepts same-origin absolute paths", () => {
    expect(safeNextPath("/student")).toBe("/student");
    expect(safeNextPath("/student/learn/1/2")).toBe("/student/learn/1/2");
    expect(safeNextPath("/?next=dashboard")).toBe("/?next=dashboard");
  });

  it("rejects protocol-relative and absolute URLs", () => {
    expect(safeNextPath("//evil.example.com")).toBeNull();
    expect(safeNextPath("https://evil.example.com")).toBeNull();
    expect(safeNextPath("http://evil.example.com")).toBeNull();
  });

  it("rejects non-path input", () => {
    expect(safeNextPath("student")).toBeNull();
    expect(safeNextPath("javascript:alert(1)")).toBeNull();
    expect(safeNextPath(null)).toBeNull();
    expect(safeNextPath(undefined)).toBeNull();
    expect(safeNextPath("")).toBeNull();
  });

  it("rejects null bytes", () => {
    expect(safeNextPath("/student\0.png")).toBeNull();
  });
});

describe("clampPercent", () => {
  it("rounds to a whole number", () => {
    expect(clampPercent(1, 3)).toBe(33);
    expect(clampPercent(2, 3)).toBe(67);
    expect(clampPercent(1, 8)).toBe(13);
  });

  it("clamps the result to 0..100", () => {
    expect(clampPercent(0, 10)).toBe(0);
    expect(clampPercent(5, 5)).toBe(100);
    expect(clampPercent(9, 5)).toBe(100); // >100% input is clamped
    expect(clampPercent(-1, 5)).toBe(0); // negative input is clamped
  });

  it("guards against division by zero", () => {
    expect(clampPercent(3, 0)).toBe(0);
    expect(clampPercent(3, -2)).toBe(0);
  });
});

describe("slugify", () => {
  it("lowercases, strips diacritics and normalizes separators", () => {
    expect(slugify("HTML & CSS Essentials!")).toBe("html-css-essentials");
    expect(slugify("  Multiple   Spaces  ")).toBe("multiple-spaces");
  });

  it("falls back for empty slugs", () => {
    expect(slugify("!!!")).toBe("item");
  });
});

describe("initials", () => {
  it("builds two-letter initials", () => {
    expect(initials("Sam", "Rivera")).toBe("SR");
    expect(initials("  avery ", "chen")).toBe("AC");
  });

  it("falls back when names are missing", () => {
    expect(initials("", "")).toBe("?");
  });
});

describe("tokens", () => {
  it("randomToken returns hex of the requested length", () => {
    expect(randomToken(16)).toMatch(/^[0-9a-f]{32}$/);
    expect(randomToken()).toMatch(/^[0-9a-f]{96}$/);
    expect(randomToken(8)).not.toBe(randomToken(8));
  });

  it("sha256Hex is deterministic and sensitive to input", () => {
    const a = sha256Hex("abc");
    expect(a).toBe(sha256Hex("abc"));
    expect(a).not.toBe(sha256Hex("abd"));
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("roleHome", () => {
  it("maps roles to their portal", () => {
    expect(roleHome("student")).toBe("/student");
    expect(roleHome("instructor")).toBe("/instructor");
    expect(roleHome("admin")).toBe("/admin");
  });
});
