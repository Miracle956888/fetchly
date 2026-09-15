/**
 * Quiz & assessment service (phase 01 scope).
 *
 * Implemented now (business logic is testable without UI):
 *  - attempt submission with server-side scoring,
 *  - attempt-count enforcement (maxAttempts),
 *  - answer validation (option must belong to the question — no tampering),
 *  - enrollment-scoped access (students may only attempt quizzes in courses
 *    they are enrolled in),
 *  - attempt history + best-score stats.
 *
 * Reserved for phase 02: the interactive quiz-taking UI, time limits,
 * additional question types, review/feedback screens.
 */
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  activityRecords,
  courses,
  enrollments,
  lessonModules,
  lessons,
  questionOptions,
  questions,
  quizAttemptAnswers,
  quizAttempts,
  quizzes,
} from "@/db/schema";
import { ConflictError, ForbiddenError, NotFoundError } from "@/lib/errors";
import { clampPercent } from "@/lib/utils";
import type { SessionUser } from "@/lib/auth/session";

// ─── Pure scoring core (unit-tested, no DB) ────────────────────────────────

export interface ScoreableQuestion {
  id: string;
  points: number;
  correctOptionId: string;
}

export interface ScoreableAnswer {
  questionId: string;
  optionId: string;
}

export interface QuizScore {
  scorePoints: number;
  totalPoints: number;
  percent: number;
  perQuestion: Record<string, boolean>; // questionId → correct?
}

/**
 * Score answers against the question set.
 * Unknown questions/answers simply score zero (defensive).
 */
export function scoreQuiz(questions: ScoreableQuestion[], answers: ScoreableAnswer[]): QuizScore {
  let scorePoints = 0;
  const totalPoints = questions.reduce((s, q) => s + q.points, 0);
  const perQuestion: Record<string, boolean> = {};
  for (const q of questions) {
    const answer = answers.find((a) => a.questionId === q.id);
    const correct = !!answer && answer.optionId === q.correctOptionId;
    perQuestion[q.id] = correct;
    if (correct) scorePoints += q.points;
  }
  return { scorePoints, totalPoints, percent: clampPercent(scorePoints, totalPoints), perQuestion };
}

// ─── Data access ───────────────────────────────────────────────────────────

export interface QuizInfo {
  id: string;
  title: string;
  lessonId: string;
  courseId: string;
  courseTitle: string;
  courseSlug: string;
  lessonTitle: string;
  passingScore: number;
  maxAttempts: number;
  questionCount: number;
}

/** Resolve a quiz's course (via lesson → module → course). */
async function resolveQuizCourse(quizId: string): Promise<{ quiz: typeof quizzes.$inferSelect; courseId: string } | null> {
  const db = await getDb();
  const [quiz] = await db.select().from(quizzes).where(eq(quizzes.id, quizId)).limit(1);
  if (!quiz) return null;
  const [lesson] = await db.select().from(lessons).where(eq(lessons.id, quiz.lessonId)).limit(1);
  if (!lesson) return null;
  const [module] = await db.select().from(lessonModules).where(eq(lessonModules.id, lesson.moduleId)).limit(1);
  if (!module) return null;
  return { quiz, courseId: module.courseId };
}

async function assertEnrolled(userId: string, courseId: string): Promise<void> {
  const db = await getDb();
  const [enrollment] = await db
    .select()
    .from(enrollments)
    .where(and(eq(enrollments.userId, userId), eq(enrollments.courseId, courseId)))
    .limit(1);
  if (!enrollment || enrollment.status === "dropped") {
    throw new ForbiddenError("You must be enrolled in this course to take its quizzes.");
  }
}

export interface AttemptSummary {
  id: string;
  scorePoints: number;
  totalPoints: number;
  percent: number;
  passed: boolean;
  submittedAt: Date;
}

export async function submitAttempt(
  user: SessionUser,
  quizId: string,
  answers: ScoreableAnswer[],
): Promise<AttemptSummary> {
  const db = await getDb();
  const resolved = await resolveQuizCourse(quizId);
  if (!resolved) throw new NotFoundError("Quiz not found.");
  const { quiz, courseId } = resolved;

  if (!quiz.isActive) throw new NotFoundError("This quiz is not available.");

  await assertEnrolled(user.id, courseId);

  const [countRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(quizAttempts)
    .where(and(eq(quizAttempts.userId, user.id), eq(quizAttempts.quizId, quiz.id)))
    .limit(1);
  if ((countRow?.count ?? 0) >= quiz.maxAttempts) {
    throw new ConflictError("You have used all attempts for this quiz.");
  }

  // Load questions + options; validate that every submitted option belongs
  // to its question (prevents answer-id tampering).
  const questionRows = await db.select().from(questions).where(eq(questions.quizId, quiz.id)).orderBy(asc(questions.sortOrder));
  if (questionRows.length === 0) throw new NotFoundError("This quiz has no questions.");
  const optionRows = await db
    .select()
    .from(questionOptions)
    .where(inArray(questionOptions.questionId, questionRows.map((q) => q.id)))
    .orderBy(asc(questionOptions.sortOrder));

  const optionsByQuestion = new Map<string, { id: string; isCorrect: boolean }[]>();
  for (const o of optionRows) {
    const list = optionsByQuestion.get(o.questionId) ?? [];
    list.push({ id: o.id, isCorrect: o.isCorrect });
    optionsByQuestion.set(o.questionId, list);
  }

  const validAnswers: ScoreableAnswer[] = [];
  for (const a of answers) {
    const opts = optionsByQuestion.get(a.questionId);
    if (!opts || !opts.some((o) => o.id === a.optionId)) continue; // ignore invalid
    validAnswers.push(a);
  }

  const scoreable: ScoreableQuestion[] = questionRows.map((q) => {
    const correct = (optionsByQuestion.get(q.id) ?? []).find((o) => o.isCorrect);
    return { id: q.id, points: q.points, correctOptionId: correct?.id ?? "__none__" };
  });
  const score = scoreQuiz(scoreable, validAnswers);
  const passed = score.percent >= quiz.passingScore;
  const now = new Date();

  const [attempt] = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(quizAttempts)
      .values({
        userId: user.id,
        quizId: quiz.id,
        scorePoints: score.scorePoints,
        totalPoints: score.totalPoints,
        percent: score.percent,
        passed,
        submittedAt: now,
      })
      .returning();

    for (const q of questionRows) {
      const answer = validAnswers.find((a) => a.questionId === q.id);
      await tx.insert(quizAttemptAnswers).values({
        attemptId: created.id,
        questionId: q.id,
        optionId: answer?.optionId ?? null,
        isCorrect: !!score.perQuestion[q.id],
      });
    }

    const [enrollment] = await tx
      .select()
      .from(enrollments)
      .where(and(eq(enrollments.userId, user.id), eq(enrollments.courseId, courseId)))
      .limit(1);
    if (enrollment) {
      await tx.update(enrollments).set({ lastActivityAt: now, updatedAt: now }).where(eq(enrollments.id, enrollment.id));
    }
    await tx.insert(activityRecords).values({
      userId: user.id,
      type: "quiz_attempted",
      entityType: "quiz",
      entityId: quiz.id,
      metadata: { quizTitle: quiz.title, percent: score.percent, passed },
    });
    return [created] as const;
  });

  return {
    id: attempt.id,
    scorePoints: attempt.scorePoints,
    totalPoints: attempt.totalPoints,
    percent: attempt.percent,
    passed: attempt.passed,
    submittedAt: attempt.submittedAt,
  };
}

export interface MyQuizStats {
  attempts: number;
  bestPercent: number | null;
  lastPercent: number | null;
  lastPassed: boolean | null;
}

export async function getMyQuizStats(userId: string, quizId: string): Promise<MyQuizStats> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(quizAttempts)
    .where(and(eq(quizAttempts.userId, userId), eq(quizAttempts.quizId, quizId)))
    .orderBy(asc(quizAttempts.submittedAt));
  if (rows.length === 0) return { attempts: 0, bestPercent: null, lastPercent: null, lastPassed: null };
  return {
    attempts: rows.length,
    bestPercent: Math.max(...rows.map((r) => r.percent)),
    lastPercent: rows[rows.length - 1].percent,
    lastPassed: rows[rows.length - 1].passed,
  };
}

/** Quizzes across the user's enrolled courses (student /student/quizzes). */
export async function listQuizzesForUser(user: SessionUser): Promise<(QuizInfo & MyQuizStats)[]> {
  const db = await getDb();
  const enrollmentsRows = await db
    .select()
    .from(enrollments)
    .where(and(eq(enrollments.userId, user.id), inArray(enrollments.status, ["active", "completed"])));
  if (enrollmentsRows.length === 0) return [];

  const courseIds = enrollmentsRows.map((e) => e.courseId);
  const quizRows = await db
    .select({
      id: quizzes.id,
      title: quizzes.title,
      lessonId: quizzes.lessonId,
      passingScore: quizzes.passingScore,
      maxAttempts: quizzes.maxAttempts,
      lessonTitle: lessons.title,
      courseId: sql<string>`(select m.course_id from ${lessonModules} m where m.id = ${lessons.moduleId})`,
      courseTitle: courses.title,
      courseSlug: courses.slug,
    })
    .from(quizzes)
    .innerJoin(lessons, eq(lessons.id, quizzes.lessonId))
    .innerJoin(lessonModules, eq(lessonModules.id, lessons.moduleId))
    .innerJoin(courses, eq(courses.id, lessonModules.courseId))
    .where(and(inArray(lessonModules.courseId, courseIds), eq(quizzes.isActive, true)))
    .orderBy(asc(courses.title), asc(lessons.sortOrder));

  const out: (QuizInfo & MyQuizStats)[] = [];
  for (const r of quizRows) {
    const [qCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(questions)
      .where(eq(questions.quizId, r.id))
      .limit(1);
    const stats = await getMyQuizStats(user.id, r.id);
    out.push({
      id: r.id,
      title: r.title,
      lessonId: r.lessonId,
      courseId: r.courseId,
      courseTitle: r.courseTitle,
      courseSlug: r.courseSlug,
      lessonTitle: r.lessonTitle,
      passingScore: r.passingScore,
      maxAttempts: r.maxAttempts,
      questionCount: qCount?.count ?? 0,
      ...stats,
    });
  }
  return out;
}
