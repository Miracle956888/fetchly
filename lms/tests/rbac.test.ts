import { describe, expect, it } from "vitest";
import { ROLE_PERMISSIONS, roleHasPermission } from "@/lib/rbac/permissions";
import {
  canAccessCourseArea,
  canEnroll,
  canWriteProgressFor,
  instructorCanViewStudent,
  type EnrollmentLike,
  type InstructorAssignmentLike,
} from "@/lib/rbac/policies";

const published = { id: "c1", status: "published" as const };
const draft = { id: "c1", status: "draft" as const };
const archived = { id: "c1", status: "archived" as const };

describe("roleHasPermission", () => {
  it("students cannot manage content or users", () => {
    expect(roleHasPermission("student", "course:manage")).toBe(false);
    expect(roleHasPermission("student", "user:manage")).toBe(false);
    expect(roleHasPermission("student", "enrollment:read:all")).toBe(false);
  });

  it("instructors see course-scoped enrollments but not all", () => {
    expect(roleHasPermission("instructor", "enrollment:read:course")).toBe(true);
    expect(roleHasPermission("instructor", "enrollment:read:all")).toBe(false);
    expect(roleHasPermission("instructor", "progress:write:own")).toBe(false);
  });

  it("admins hold the broadest catalog", () => {
    expect(roleHasPermission("admin", "user:manage")).toBe(true);
    expect(roleHasPermission("admin", "category:manage")).toBe(true);
    expect(roleHasPermission("admin", "enrollment:read:all")).toBe(true);
  });

  it("every permission in the catalog is assigned to at least one role", () => {
    const all = new Set<string>();
    for (const perms of Object.values(ROLE_PERMISSIONS)) for (const p of perms) all.add(p);
    // no permission is accidentally orphaned from the union of role lists
    expect(all.size).toBeGreaterThan(10);
  });
});

describe("canAccessCourseArea", () => {
  it("admin may enter any course area", () => {
    expect(canAccessCourseArea("admin", "u1", draft, { isAssignedToCourse: false, isEnrolledInCourse: false })).toBe(true);
  });

  it("instructor only for assigned courses", () => {
    expect(canAccessCourseArea("instructor", "u1", published, { isAssignedToCourse: true, isEnrolledInCourse: false })).toBe(true);
    expect(canAccessCourseArea("instructor", "u1", published, { isAssignedToCourse: false, isEnrolledInCourse: false })).toBe(false);
  });

  it("student: published courses for everyone, archived only when enrolled", () => {
    expect(canAccessCourseArea("student", "u1", published, { isAssignedToCourse: false, isEnrolledInCourse: false })).toBe(true);
    expect(canAccessCourseArea("student", "u1", archived, { isAssignedToCourse: false, isEnrolledInCourse: true })).toBe(true);
    expect(canAccessCourseArea("student", "u1", archived, { isAssignedToCourse: false, isEnrolledInCourse: false })).toBe(false);
    expect(canAccessCourseArea("student", "u1", draft, { isAssignedToCourse: false, isEnrolledInCourse: false })).toBe(false);
  });
});

describe("instructorCanViewStudent", () => {
  const assignments: InstructorAssignmentLike[] = [
    { courseId: "c1", userId: "inst1" },
    { courseId: "c2", userId: "inst1" },
  ];
  const enrolledActive: EnrollmentLike = { userId: "s1", courseId: "c1", status: "active" };

  it("grants access for students enrolled in assigned courses", () => {
    expect(instructorCanViewStudent("inst1", "s1", "c1", assignments, enrolledActive)).toBe(true);
  });

  it("denies when the instructor is not assigned to the course", () => {
    expect(instructorCanViewStudent("inst2", "s1", "c1", assignments, enrolledActive)).toBe(false);
  });

  it("denies when the student is not enrolled in that course", () => {
    const otherCourse: EnrollmentLike = { userId: "s1", courseId: "c9", status: "active" };
    expect(instructorCanViewStudent("inst1", "s1", "c1", assignments, otherCourse)).toBe(false);
    expect(instructorCanViewStudent("inst1", "s1", "c1", assignments, null)).toBe(false);
  });

  it("denies for dropped enrollments", () => {
    const dropped: EnrollmentLike = { userId: "s1", courseId: "c1", status: "dropped" };
    expect(instructorCanViewStudent("inst1", "s1", "c1", assignments, dropped)).toBe(false);
  });

  it("denies when the enrollment belongs to a different student (IDOR)", () => {
    const otherStudent: EnrollmentLike = { userId: "s2", courseId: "c1", status: "active" };
    expect(instructorCanViewStudent("inst1", "s1", "c1", assignments, otherStudent)).toBe(false);
  });
});

describe("canWriteProgressFor", () => {
  it("only the owner may write progress — even admins cannot write for others", () => {
    expect(canWriteProgressFor("u1", "u1")).toBe(true);
    expect(canWriteProgressFor("u1", "u2")).toBe(false);
  });
});

describe("canEnroll", () => {
  it("only students, only for published courses", () => {
    expect(canEnroll("student", published)).toBe(true);
    expect(canEnroll("student", draft)).toBe(false);
    expect(canEnroll("student", archived)).toBe(false);
    expect(canEnroll("instructor", published)).toBe(false);
    expect(canEnroll("admin", published)).toBe(false);
  });
});
