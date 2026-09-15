/**
 * Student dashboard aggregation (real data only).
 */
import { eq, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { enrollments, lessonProgress, quizAttempts, courseCompletions } from "@/db/schema";

export interface StudentDashboardStats {
  enrolledCourses: number;
  completedLessons: number;
  quizAttempts: number;
  averageQuizScore: number | null;
  completedCourses: number;
}

export async function getStudentDashboardStats(userId: string): Promise<StudentDashboardStats> {
  const db = await getDb();
  const [enrolled, lessons, attempts, completions] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(enrollments)
      .where(eq(enrollments.userId, userId))
      .limit(1),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(lessonProgress)
      .where(eq(lessonProgress.userId, userId))
      .limit(1),
    db
      .select({ count: sql<number>`count(*)::int`, avg: sql<number>`round(avg(${quizAttempts.percent})::numeric, 0)::int` })
      .from(quizAttempts)
      .where(eq(quizAttempts.userId, userId))
      .limit(1),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(courseCompletions)
      .where(eq(courseCompletions.userId, userId))
      .limit(1),
  ]);
  return {
    enrolledCourses: enrolled?.[0]?.count ?? 0,
    completedLessons: lessons?.[0]?.count ?? 0,
    quizAttempts: attempts?.[0]?.count ?? 0,
    averageQuizScore: attempts?.[0] && attempts[0].count > 0 ? (attempts[0].avg as number) ?? null : null,
    completedCourses: completions?.[0]?.count ?? 0,
  };
}
