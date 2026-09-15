/**
 * Learning-context builder for the AI assistant.
 *
 * Builds the `LearningContext` the assistant answers with: course → module →
 * lesson (+ content), the student's progress, and whether the lesson carries
 * a graded quiz. Access is enforced here (server-side): a student may only
 * build context for courses they are enrolled in.
 */
import { and, asc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  courses,
  enrollments,
  exercises,
  lessonModules,
  lessons,
  quizzes,
} from "@/db/schema";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { computeCourseProgress } from "../course.service";
import type { LearningContext } from "./provider";

const CONTENT_LIMIT = 6000;

export interface AssistantContextInput {
  userId: string;
  courseId?: string;
  lessonId?: string;
}

export async function buildLearningContext(input: AssistantContextInput): Promise<LearningContext> {
  const db = await getDb();
  const base: LearningContext = {
    userId: input.userId,
    course: null,
    module: null,
    lesson: null,
    progress: null,
  };

  // Resolve the course (explicit, or the lesson's course).
  let courseId = input.courseId ?? null;
  let lesson = null as null | typeof lessons.$inferSelect;

  if (input.lessonId) {
    const [l] = await db.select().from(lessons).where(eq(lessons.id, input.lessonId)).limit(1);
    if (!l) throw new NotFoundError("Lesson not found.");
    lesson = l;
    const [m] = await db.select().from(lessonModules).where(eq(lessonModules.id, lesson.moduleId)).limit(1);
    if (!m) throw new NotFoundError("Lesson module not found.");
    courseId = m.courseId;
  }

  if (!courseId) return base; // course-less context (e.g. course home) — allowed, minimal

  const [course] = await db.select().from(courses).where(eq(courses.id, courseId)).limit(1);
  if (!course) throw new NotFoundError("Course not found.");

  // ACCESS CHECK — enrolled (active or completed), or the course is the
  // student's current one. Instructor/admin assistant usage comes via the
  // same enrollment-independent path only for their assigned courses (Phase 03).
  if (input.userId) {
    const [enr] = await db
      .select()
      .from(enrollments)
      .where(and(eq(enrollments.userId, input.userId), eq(enrollments.courseId, courseId)))
      .limit(1);
    if (!enr || enr.status === "dropped") {
      throw new ForbiddenError("You can only ask about courses you are enrolled in.");
    }
  }

  base.course = {
    id: course.id,
    title: course.title,
    slug: course.slug,
    difficulty: course.difficulty,
  };

  // Module + progress for the course.
  if (lesson) {
    const [m] = await db.select().from(lessonModules).where(eq(lessonModules.id, lesson.moduleId)).limit(1);
    if (m) base.module = { id: m.id, title: m.title };
  }

  const progress = await computeCourseProgress(input.userId, courseId);
  base.progress = { percent: progress.percent, completed: progress.completedLessons, total: progress.totalLessons };

  // Lesson content + graded-quiz flag.
  const targetLesson = lesson ?? (await firstLessonOf(courseId));
  if (targetLesson) {
    const [quiz] = await db
      .select({ id: quizzes.id })
      .from(quizzes)
      .where(eq(quizzes.lessonId, targetLesson.id))
      .limit(1);
    base.lesson = {
      id: targetLesson.id,
      title: targetLesson.title,
      content: targetLesson.content.slice(0, CONTENT_LIMIT),
      language: targetLesson.language,
      hasExercise: await hasExercise(targetLesson.id),
      hasQuiz: !!quiz,
      activeGradedQuiz: !!quiz,
    };
    if (!base.module && targetLesson.moduleId) {
      const [m] = await db.select().from(lessonModules).where(eq(lessonModules.id, targetLesson.moduleId)).limit(1);
      if (m) base.module = { id: m.id, title: m.title };
    }
  }

  return base;
}

async function firstLessonOf(courseId: string) {
  const db = await getDb();
  const modules = await db
    .select({ id: lessonModules.id })
    .from(lessonModules)
    .where(eq(lessonModules.courseId, courseId))
    .orderBy(asc(lessonModules.sortOrder));
  if (modules.length === 0) return null;
  const [l] = await db
    .select()
    .from(lessons)
    .where(inArray(lessons.moduleId, modules.map((m) => m.id)))
    .orderBy(asc(lessons.sortOrder))
    .limit(1);
  return l ?? null;
}

async function hasExercise(lessonId: string): Promise<boolean> {
  const db = await getDb();
  const rows = await db.select({ id: exercises.id }).from(exercises).where(eq(exercises.lessonId, lessonId)).limit(1);
  return rows.length > 0;
}
