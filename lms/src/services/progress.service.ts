/**
 * Progress tracking service.
 *
 * Rules (enforced server-side):
 *  - a student can only write progress on lessons of courses they are
 *    enrolled in (IDOR protection — the lesson id alone is never trusted),
 *  - completion is per (user, lesson) and idempotent,
 *  - every state change updates the enrollment's last-activity stamp and
 *    appends an activity record.
 *
 * Progress math (documented formula):
 *  course % = completed lessons / total lessons, rounded
 *  module state = complete | in-progress | not-started (from its lesson counts)
 */
import { and, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  activityRecords,
  courses,
  enrollments,
  lessonModules,
  lessons,
  lessonProgress,
  users,
} from "@/db/schema";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { canWriteProgressFor } from "@/lib/rbac/policies";
import type { SessionUser } from "@/lib/auth/session";
import { computeCourseProgress } from "./course.service";

/**
 * Mark a lesson completed (true) for the current user.
 * `completed` is currently only ever `true` (un-completing is a phase 02 UX).
 */
export async function markLessonCompleted(user: SessionUser, lessonId: string): Promise<{ percent: number }> {
  const db = await getDb();

  // Resolve lesson → module → course.
  const [lesson] = await db.select().from(lessons).where(eq(lessons.id, lessonId)).limit(1);
  if (!lesson) throw new NotFoundError("Lesson not found.");
  const [module] = await db
    .select()
    .from(lessonModules)
    .where(eq(lessonModules.id, lesson.moduleId))
    .limit(1);
  if (!module) throw new NotFoundError("Lesson module not found.");

  // Ownership: the user must be enrolled in this course (active or completed).
  const [enrollment] = await db
    .select()
    .from(enrollments)
    .where(and(eq(enrollments.userId, user.id), eq(enrollments.courseId, module.courseId)))
    .limit(1);
  if (!enrollment || enrollment.status === "dropped") {
    throw new ForbiddenError("You must be enrolled in this course to record progress.");
  }
  if (!canWriteProgressFor(user.id, user.id)) {
    throw new ForbiddenError();
  }

  const now = new Date();
  await db.transaction(async (tx) => {
    await tx
      .insert(lessonProgress)
      .values({ userId: user.id, lessonId, completed: true, completedAt: now })
      .onConflictDoUpdate({
        target: [lessonProgress.userId, lessonProgress.lessonId],
        set: { completed: true, completedAt: now, updatedAt: now },
      });
    await tx
      .update(enrollments)
      .set({ lastActivityAt: now, updatedAt: now })
      .where(eq(enrollments.id, enrollment.id));
    await tx.insert(activityRecords).values({
      userId: user.id,
      type: "lesson_completed",
      entityType: "lesson",
      entityId: lessonId,
      metadata: { lessonTitle: lesson.title, courseId: module.courseId },
    });
  });

  const progress = await computeCourseProgress(user.id, module.courseId);
  return { percent: progress.percent };
}

export interface ProgressCourseRow {
  id: string;
  title: string;
  slug: string;
  status: "active" | "completed" | "dropped";
  percent: number;
  completedLessons: number;
  totalLessons: number;
  lastActivityAt: Date | null;
  modules: { title: string; percent: number }[];
}

/** Cross-course progress overview for /student/progress. */
export async function listMyProgress(user: SessionUser): Promise<ProgressCourseRow[]> {
  const db = await getDb();
  const rows = await db
    .select({
      courseId: enrollments.courseId,
      status: enrollments.status,
      lastActivityAt: enrollments.lastActivityAt,
      title: courses.title,
      slug: courses.slug,
    })
    .from(enrollments)
    .innerJoin(courses, eq(courses.id, enrollments.courseId))
    .where(eq(enrollments.userId, user.id))
    .orderBy(desc(enrollments.createdAt));

  const out: ProgressCourseRow[] = [];
  for (const r of rows) {
    const progress = await computeCourseProgress(user.id, r.courseId);
    out.push({
      id: r.courseId,
      title: r.title,
      slug: r.slug,
      status: r.status,
      percent: progress.percent,
      completedLessons: progress.completedLessons,
      totalLessons: progress.totalLessons,
      lastActivityAt: r.lastActivityAt,
      modules: progress.modules.map((m) => ({ title: m.title, percent: m.percent })),
    });
  }
  return out;
}

export interface ActivityEntry {
  id: string;
  type: string;
  entityType: string | null;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}

/** Most recent activity for the user (dashboard feed). */
export async function listRecentActivity(userId: string, limit = 8): Promise<ActivityEntry[]> {
  const db = await getDb();
  return db
    .select()
    .from(activityRecords)
    .where(eq(activityRecords.userId, userId))
    .orderBy(desc(activityRecords.createdAt))
    .limit(limit);
}

/** Recent platform-wide activity (admin dashboard). */
export async function listPlatformActivity(limit = 10): Promise<(ActivityEntry & { username: string | null })[]> {
  const db = await getDb();
  return db
    .select({
      id: activityRecords.id,
      type: activityRecords.type,
      entityType: activityRecords.entityType,
      entityId: activityRecords.entityId,
      metadata: activityRecords.metadata,
      createdAt: activityRecords.createdAt,
      username: sql<string | null>`(select u.username from ${users} u where u.id = ${activityRecords.userId})`,
    })
    .from(activityRecords)
    .orderBy(desc(activityRecords.createdAt))
    .limit(limit);
}
