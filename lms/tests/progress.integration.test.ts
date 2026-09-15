/**
 * DB-backed integration test for the documented progress formula:
 *   course % = completed lessons / total lessons (rounded)
 * Run against a throwaway PGlite instance (./data/pglite-test) — the real
 * dev database is never touched.
 */
import { rmSync } from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

process.env.DATABASE_DRIVER = "pglite";
process.env.PG_DATA_DIR = path.resolve(process.cwd(), "data", "pglite-test");
process.env.AUTO_MIGRATE = "true";

import { closeDb, getDb } from "@/db/client";
import { courses, enrollments, lessonModules, lessons, users } from "@/db/schema";
import { markLessonCompleted } from "@/services/progress.service";
import { ForbiddenError } from "@/lib/errors";
import type { SessionUser } from "@/lib/auth/session";

const TEST_USER: SessionUser = {
  id: "",
  email: "owner@test.local",
  username: "owner",
  role: "student",
  firstName: "Owner",
  lastName: "Test",
  phone: null,
  country: null,
  bio: null,
  timezone: null,
  avatarUrl: null,
  createdAt: new Date(),
};
const OTHER_USER: SessionUser = { ...TEST_USER, id: "", email: "other@test.local", username: "other" };

let ownerDbId = "";
let otherDbId = "";
let courseId = "";
const lessonIds: string[] = [];

beforeAll(async () => {
  const db = await getDb();

  const [owner] = await db.insert(users).values({ email: TEST_USER.email, username: TEST_USER.username, passwordHash: "x", role: "student" }).returning();
  const [other] = await db.insert(users).values({ email: OTHER_USER.email, username: OTHER_USER.username, passwordHash: "x", role: "student" }).returning();
  ownerDbId = owner.id;
  otherDbId = other.id;

  const [course] = await db.insert(courses).values({ title: "Integration Course", slug: "integration-course", description: "test", status: "published" }).returning();
  courseId = course.id;
  const [module] = await db.insert(lessonModules).values({ courseId, title: "M1", sortOrder: 1 }).returning();
  for (let i = 1; i <= 3; i++) {
    const [lesson] = await db.insert(lessons).values({ moduleId: module.id, title: `L${i}`, sortOrder: i, estimatedMinutes: 5 }).returning();
    lessonIds.push(lesson.id);
  }

  await db.insert(enrollments).values({ userId: ownerDbId, courseId, status: "active" });

  TEST_USER.id = ownerDbId;
  OTHER_USER.id = otherDbId;
}, 120_000);

afterAll(async () => {
  await closeDb();
  rmSync(path.resolve(process.cwd(), "data", "pglite-test"), { recursive: true, force: true });
});

describe("progress formula (integration)", () => {
  it("computes % = completed / total, rounded", async () => {
    const p1 = await markLessonCompleted(TEST_USER, lessonIds[0]);
    expect(p1.percent).toBe(33); // 1/3

    const p2 = await markLessonCompleted(TEST_USER, lessonIds[1]);
    expect(p2.percent).toBe(67); // 2/3

    const p3 = await markLessonCompleted(TEST_USER, lessonIds[2]);
    expect(p3.percent).toBe(100); // 3/3
  });

  it("is idempotent: re-completing does not double count", async () => {
    const again = await markLessonCompleted(TEST_USER, lessonIds[0]);
    expect(again.percent).toBe(100);
  });

  it("blocks progress writes by users who are not enrolled (IDOR)", async () => {
    await expect(markLessonCompleted(OTHER_USER, lessonIds[0])).rejects.toBeInstanceOf(ForbiddenError);
  });
});
