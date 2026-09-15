/**
 * Admin portal data service: platform-wide statistics and read models for
 * the admin sections. (Mutations — user management, course/category CRUD —
 * arrive in phase 02 behind the same service layer.)
 */
import { asc, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  categories,
  certificates,
  courseCompletions,
  courseInstructors,
  courses,
  enrollments,
  learningPathCourses,
  learningPaths,
  lessonModules,
  lessons,
  profiles,
  questions,
  quizAttempts,
  quizzes,
  users,
} from "@/db/schema";
import { countUsersByRole, toSafeUser, type UserListRow } from "./user.service";
import { courseStatusCounts } from "./course.service";

export interface PlatformStats {
  usersByRole: Record<"student" | "instructor" | "admin", number>;
  coursesByStatus: Record<"draft" | "published" | "archived", number>;
  categories: number;
  activeEnrollments: number;
  completions: number;
  certificatesIssued: number;
  quizAttemptsTotal: number;
}

export async function getPlatformStats(): Promise<PlatformStats> {
  const db = await getDb();
  const [
    usersByRole,
    coursesByStatus,
    catCount,
    enrCount,
    compCount,
    certCount,
    quizCount,
  ] = await Promise.all([
    countUsersByRole(),
    courseStatusCounts(),
    db.select({ count: sql<number>`count(*)::int` }).from(categories).limit(1),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(enrollments)
      .where(eq(enrollments.status, "active"))
      .limit(1),
    db.select({ count: sql<number>`count(*)::int` }).from(courseCompletions).limit(1),
    db.select({ count: sql<number>`count(*)::int` }).from(certificates).limit(1),
    db.select({ count: sql<number>`count(*)::int` }).from(quizAttempts).limit(1),
  ]);
  return {
    usersByRole,
    coursesByStatus,
    categories: catCount?.[0]?.count ?? 0,
    activeEnrollments: enrCount?.[0]?.count ?? 0,
    completions: compCount?.[0]?.count ?? 0,
    certificatesIssued: certCount?.[0]?.count ?? 0,
    quizAttemptsTotal: quizCount?.[0]?.count ?? 0,
  };
}

export interface RecentUserRow {
  user: ReturnType<typeof toSafeUser>;
  createdAt: Date;
}

export async function listRecentUsers(limit = 5): Promise<UserListRow[]> {
  const db = await getDb();
  const rows = await db
    .select({ user: users, profile: profiles })
    .from(users)
    .leftJoin(profiles, eq(profiles.userId, users.id))
    .orderBy(desc(users.createdAt))
    .limit(limit);
  return rows.map((r) => ({ user: toSafeUser(r.user, r.profile), isActive: r.user.isActive }));
}

export interface AdminEnrollmentRow {
  id: string;
  studentName: string;
  studentUsername: string;
  courseTitle: string;
  courseSlug: string;
  status: "active" | "completed" | "dropped";
  enrolledAt: Date;
  lastActivityAt: Date | null;
}

export async function listEnrollments(filter: { page: number; perPage: number }): Promise<{ rows: AdminEnrollmentRow[]; total: number }> {
  const db = await getDb();
  const [countRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(enrollments)
    .limit(1);
  const rows = await db
    .select({
      id: enrollments.id,
      status: enrollments.status,
      enrolledAt: enrollments.createdAt,
      lastActivityAt: enrollments.lastActivityAt,
      courseTitle: courses.title,
      courseSlug: courses.slug,
      studentFirst: profiles.firstName,
      studentLast: profiles.lastName,
      studentUsername: users.username,
    })
    .from(enrollments)
    .innerJoin(users, eq(users.id, enrollments.userId))
    .leftJoin(profiles, eq(profiles.userId, users.id))
    .innerJoin(courses, eq(courses.id, enrollments.courseId))
    .orderBy(desc(enrollments.createdAt))
    .limit(filter.perPage)
    .offset((filter.page - 1) * filter.perPage);
  return {
    rows: rows.map((r) => ({
      id: r.id,
      studentName: `${r.studentFirst ?? ""} ${r.studentLast ?? ""}`.trim(),
      studentUsername: r.studentUsername,
      courseTitle: r.courseTitle,
      courseSlug: r.courseSlug,
      status: r.status,
      enrolledAt: r.enrolledAt,
      lastActivityAt: r.lastActivityAt,
    })),
    total: countRow?.count ?? 0,
  };
}

export interface AdminQuizRow {
  id: string;
  title: string;
  courseTitle: string;
  questionCount: number;
  attemptCount: number;
  passingScore: number;
  isActive: boolean;
}

export async function listQuizzes(): Promise<AdminQuizRow[]> {
  const db = await getDb();
  return db
    .select({
      id: quizzes.id,
      title: quizzes.title,
      passingScore: quizzes.passingScore,
      isActive: quizzes.isActive,
      courseTitle: courses.title,
      questionCount: sql<number>`(select count(*)::int from ${questions} q where q.quiz_id = ${quizzes.id})`,
      attemptCount: sql<number>`(select count(*)::int from ${quizAttempts} a where a.quiz_id = ${quizzes.id})`,
    })
    .from(quizzes)
    .innerJoin(lessons, eq(lessons.id, quizzes.lessonId))
    .innerJoin(lessonModules, eq(lessonModules.id, lessons.moduleId))
    .innerJoin(courses, eq(courses.id, lessonModules.courseId))
    .orderBy(asc(courses.title), asc(quizzes.title));
}

export interface AdminLearningPathRow {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  courseCount: number;
}

export async function listLearningPaths(): Promise<AdminLearningPathRow[]> {
  const db = await getDb();
  return db
    .select({
      id: learningPaths.id,
      title: learningPaths.title,
      slug: learningPaths.slug,
      description: learningPaths.description,
      courseCount: sql<number>`(select count(*)::int from ${learningPathCourses} e where e.learning_path_id = ${learningPaths.id})`,
    })
    .from(learningPaths)
    .orderBy(asc(learningPaths.sortOrder));
}

export interface AdminInstructorRow {
  user: ReturnType<typeof toSafeUser>;
  assignedCourseCount: number;
  assignedCourses: { id: string; title: string }[];
}

export async function listInstructorsWithCourses(): Promise<AdminInstructorRow[]> {
  const db = await getDb();
  const rows = await db
    .select({ user: users, profile: profiles })
    .from(users)
    .leftJoin(profiles, eq(profiles.userId, users.id))
    .where(eq(users.role, "instructor"))
    .orderBy(asc(users.createdAt));
  const out: AdminInstructorRow[] = [];
  for (const r of rows) {
    const assignments = await db
      .select({ courseId: courseInstructors.courseId, title: courses.title })
      .from(courseInstructors)
      .innerJoin(courses, eq(courses.id, courseInstructors.courseId))
      .where(eq(courseInstructors.userId, r.user.id))
      .orderBy(asc(courses.title));
    out.push({
      user: toSafeUser(r.user, r.profile),
      assignedCourseCount: assignments.length,
      assignedCourses: assignments.map((a) => ({ id: a.courseId, title: a.title })),
    });
  }
  return out;
}
