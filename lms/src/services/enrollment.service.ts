/**
 * Enrollment service: student ↔ course.
 *
 * Rules enforced here (server-side, authoritative):
 *  - only student-role accounts can enroll,
 *  - only published courses can be enrolled in,
 *  - enrollment is idempotent per (student, course),
 *  - every enrollment writes an activity record (audit trail).
 */
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { activityRecords, courses, enrollments } from "@/db/schema";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { canEnroll } from "@/lib/rbac/policies";
import type { SessionUser } from "@/lib/auth/session";
import { computeCourseProgress } from "./course.service";

export interface EnrollmentRow {
  id: string;
  status: "active" | "completed" | "dropped";
  enrolledAt: Date;
  lastActivityAt: Date | null;
}

export async function enroll(user: SessionUser, courseId: string): Promise<EnrollmentRow> {
  const db = await getDb();
  const [course] = await db.select({ id: courses.id, status: courses.status }).from(courses).where(eq(courses.id, courseId)).limit(1);
  if (!course) throw new NotFoundError("Course not found.");

  if (!canEnroll(user.role, { id: course.id, status: course.status })) {
    throw new ForbiddenError("You can only enroll in published courses as a student.");
  }

  // Idempotency: reuse the existing enrollment when present.
  const [existing] = await db
    .select()
    .from(enrollments)
    .where(and(eq(enrollments.userId, user.id), eq(enrollments.courseId, courseId)))
    .limit(1);

  if (existing) {
    if (existing.status === "dropped") {
      // Re-enrollment after dropping: reactivate the pair.
      const [reactivated] = await db
        .update(enrollments)
        .set({ status: "active", droppedAt: null, lastActivityAt: new Date(), updatedAt: new Date() })
        .where(eq(enrollments.id, existing.id))
        .returning();
      return { id: reactivated.id, status: reactivated.status, enrolledAt: reactivated.createdAt, lastActivityAt: reactivated.lastActivityAt };
    }
    return {
      id: existing.id,
      status: existing.status,
      enrolledAt: existing.createdAt,
      lastActivityAt: existing.lastActivityAt,
    };
  }

  const [created] = await db.transaction(async (tx) => {
    const [enrollment] = await tx
      .insert(enrollments)
      .values({ userId: user.id, courseId, status: "active", lastActivityAt: new Date() })
      .returning();
    await tx.insert(activityRecords).values({
      userId: user.id,
      type: "course_enrolled",
      entityType: "course",
      entityId: courseId,
    });
    return [enrollment] as const;
  });

  return {
    id: created.id,
    status: created.status,
    enrolledAt: created.createdAt,
    lastActivityAt: created.lastActivityAt,
  };
}

export interface MyEnrollment {
  id: string;
  courseId: string;
  courseTitle: string;
  courseSlug: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  status: "active" | "completed" | "dropped";
  enrolledAt: Date;
  lastActivityAt: Date | null;
  percent: number;
  totalLessons: number;
  completedLessons: number;
}

export async function listMyEnrollments(user: SessionUser): Promise<MyEnrollment[]> {
  const db = await getDb();
  const rows = await db
    .select({
      id: enrollments.id,
      courseId: enrollments.courseId,
      status: enrollments.status,
      enrolledAt: enrollments.createdAt,
      lastActivityAt: enrollments.lastActivityAt,
      courseTitle: courses.title,
      courseSlug: courses.slug,
      difficulty: courses.difficulty,
    })
    .from(enrollments)
    .innerJoin(courses, eq(courses.id, enrollments.courseId))
    .where(eq(enrollments.userId, user.id))
    .orderBy(desc(enrollments.createdAt));

  const out: MyEnrollment[] = [];
  for (const r of rows) {
    const progress = await computeCourseProgress(user.id, r.courseId);
    out.push({
      id: r.id,
      courseId: r.courseId,
      courseTitle: r.courseTitle,
      courseSlug: r.courseSlug,
      difficulty: r.difficulty,
      status: r.status,
      enrolledAt: r.enrolledAt,
      lastActivityAt: r.lastActivityAt,
      percent: progress.percent,
      totalLessons: progress.totalLessons,
      completedLessons: progress.completedLessons,
    });
  }
  return out;
}

/** Enrollment lookup used by progress/quiz authorization. */
export async function getEnrollment(userId: string, courseId: string) {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(enrollments)
    .where(and(eq(enrollments.userId, userId), eq(enrollments.courseId, courseId)))
    .limit(1);
  return row ?? null;
}

/** All enrollments for a course (admin/instructor use — scoped by caller). */
export async function listCourseEnrollments(courseId: string) {
  const db = await getDb();
  return db
    .select()
    .from(enrollments)
    .where(eq(enrollments.courseId, courseId))
    .orderBy(desc(enrollments.createdAt));
}

export async function countEnrollments(courseIds: string[]): Promise<Map<string, number>> {
  if (courseIds.length === 0) return new Map();
  const db = await getDb();
  const rows = await db
    .select({ courseId: enrollments.courseId, count: sql<number>`count(*)::int` })
    .from(enrollments)
    .where(inArray(enrollments.courseId, courseIds))
    .groupBy(enrollments.courseId);
  return new Map(rows.map((r) => [r.courseId, r.count]));
}
