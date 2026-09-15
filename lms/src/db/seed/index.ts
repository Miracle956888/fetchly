/**
 * DEVELOPMENT SEED — orchestrator.
 *
 *   npm run db:seed
 *
 * Creates a clearly-labeled development dataset:
 *   - 3 roles, 5 users (1 admin, 2 instructors, 2 students)
 *   - 12 categories
 *   - 6 courses (5 published with full original content, 1 draft)
 *   - 4 quizzes attached to lessons
 *   - 2 learning paths
 *   - instructor assignments
 *   - enrollments + realistic lesson progress + quiz attempts
 *   - activity records
 *
 * Idempotency: every section checks for existing rows before inserting, so
 * re-running never duplicates data and never destroys learner progress.
 *
 * ⚠️  This script is for DEVELOPMENT only. It contains dev credentials and
 * must not be run against a production database.
 */
import "dotenv/config";
import { eq, and, inArray, desc } from "drizzle-orm";
import { closeDb, getDb } from "../client";
import {
  categories,
courseInstructors,
  courses,
  enrollments,
  exercises,
  lessonModules,
  lessons,
  lessonProgress,
  learningPathCourses,
  learningPaths,
  profiles,
  questionOptions,
  questions,
  quizAttemptAnswers,
  quizAttempts,
  quizzes,
  activityRecords,
  roles,
  users,
} from "../schema";
import { hashPassword } from "@/lib/auth/password";
import { devUsers, DEV_PASSWORD } from "./users";
import { devCategories } from "./categories";
import { htmlCourse, cssCourse, type CourseSeed } from "./content-html-css";
import { javascriptCourse, pythonCourse, nodeCourse, mysqlCourse } from "./content-js-python-node-mysql";
import { devQuizzes } from "./quizzes";

const ALL_COURSES: CourseSeed[] = [htmlCourse, cssCourse, javascriptCourse, pythonCourse, nodeCourse, mysqlCourse];

const LEARNING_PATHS = [
  {
    title: "Front-End Foundations",
    slug: "front-end-foundations",
    description: "The classic first path: structure (HTML), style (CSS), behavior (JavaScript) — in teaching order.",
    courseSlugs: ["html", "css", "javascript"],
  },
  {
    title: "Back-End Essentials",
    slug: "back-end-essentials",
    description: "JavaScript on the server: the Node.js runtime first, then frameworks and APIs as courses land.",
    courseSlugs: ["nodejs"],
  },
];

// Realistic progress targets (student → course → approx. percent).
const PROGRESS_TARGETS: { username: string; courseSlug: string; percent: number }[] = [
  { username: "sam.rivera", courseSlug: "html", percent: 75 },
  { username: "sam.rivera", courseSlug: "css", percent: 42 },
  { username: "sam.rivera", courseSlug: "javascript", percent: 8 },
  { username: "taylor.chen", courseSlug: "javascript", percent: 33 },
  { username: "taylor.chen", courseSlug: "python", percent: 56 },
];

// Quiz attempts to seed (user, quiz course, [percentages in order]).
const ATTEMPT_TARGETS: { username: string; courseSlug: string; percents: number[] }[] = [
  { username: "sam.rivera", courseSlug: "html", percents: [50, 83] },
  { username: "taylor.chen", courseSlug: "python", percents: [80] },
];

const INSTRUCTOR_ASSIGNMENTS: { username: string; courseSlug: string; role: "lead" | "instructor" }[] = [
  { username: "john.carter", courseSlug: "html", role: "lead" },
  { username: "john.carter", courseSlug: "css", role: "instructor" },
  { username: "john.carter", courseSlug: "javascript", role: "instructor" },
  { username: "priya.nair", courseSlug: "python", role: "lead" },
  { username: "priya.nair", courseSlug: "nodejs", role: "instructor" },
];

const DAY = 24 * 60 * 60 * 1000;

async function main() {
  const db = await getDb();
  const now = new Date();
  const log: string[] = [];

  // ── 1. Roles ────────────────────────────────────────────────────────────
  const roleRows = [
    { key: "student", name: "Student", description: "Learns courses, tracks progress, completes assessments." },
    { key: "instructor", name: "Instructor", description: "Teaches assigned courses and follows enrolled students." },
    { key: "admin", name: "Administrator", description: "Manages the platform: users, catalog, categories, health." },
  ];
  for (const r of roleRows) {
    await db
      .insert(roles)
      .values(r)
      .onConflictDoUpdate({ target: roles.key, set: { name: r.name, description: r.description } });
  }
  log.push(`roles: ${roleRows.length}`);

  // ── 2. Users + profiles ─────────────────────────────────────────────────
  const userBy = new Map<string, { id: string; role: string }>();
  for (const u of devUsers) {
    const [existing] = await db.select().from(users).where(eq(users.username, u.username)).limit(1);
    if (existing) {
      userBy.set(u.username, { id: existing.id, role: existing.role });
      continue;
    }
    const [created] = await db
      .insert(users)
      .values({
        username: u.username,
        email: u.email,
        passwordHash: await hashPassword(u.password),
        role: u.role,
        createdAt: new Date(now.getTime() - 21 * DAY),
        updatedAt: new Date(),
      })
      .returning();
    await db.insert(profiles).values({
      userId: created.id,
      firstName: u.firstName,
      lastName: u.lastName,
      country: u.country ?? null,
      bio: u.bio ?? null,
      createdAt: new Date(now.getTime() - 21 * DAY),
    });
    userBy.set(u.username, { id: created.id, role: u.role });
  }
  log.push(`users: ${userBy.size} (dev password for all: ${DEV_PASSWORD})`);

  // ── 3. Categories ───────────────────────────────────────────────────────
  const categoryBy = new Map<string, string>();
  for (const c of devCategories) {
    const [row] = await db
      .insert(categories)
      .values({ name: c.name, slug: c.slug, description: c.description, sortOrder: c.sortOrder })
      .onConflictDoUpdate({
        target: categories.slug,
        set: { name: c.name, description: c.description, sortOrder: c.sortOrder, updatedAt: new Date() },
      })
      .returning();
    categoryBy.set(c.slug, row.id);
  }
  log.push(`categories: ${categoryBy.size}`);

  // ── 4. Courses + curriculum ─────────────────────────────────────────────
  const courseBy = new Map<string, string>();
  for (const seed of ALL_COURSES) {
    const [existing] = await db.select().from(courses).where(eq(courses.slug, seed.slug)).limit(1);
    if (existing) {
      courseBy.set(seed.slug, existing.id);
      continue;
    }
    const categoryId = categoryBy.get(seed.categorySlug) ?? null;
    const [course] = await db
      .insert(courses)
      .values({
        title: seed.title,
        slug: seed.slug,
        description: seed.description,
        longDescription: seed.longDescription ?? null,
        categoryId,
        difficulty: seed.difficulty,
        durationHours: seed.durationHours,
        status: seed.status,
        learningObjectives: seed.objectives,
        prerequisites: seed.prerequisites,
        publishedAt: seed.status === "published" ? new Date(now.getTime() - 14 * DAY) : null,
        createdAt: new Date(now.getTime() - 14 * DAY),
      })
      .returning();
    courseBy.set(seed.slug, course.id);

    for (let mi = 0; mi < seed.modules.length; mi++) {
      const m = seed.modules[mi];
      const [module] = await db
        .insert(lessonModules)
        .values({ courseId: course.id, title: m.title, description: m.description ?? null, sortOrder: mi })
        .returning();

      for (let li = 0; li < m.lessons.length; li++) {
        const l = m.lessons[li];
        const [lesson] = await db
          .insert(lessons)
          .values({
            moduleId: module.id,
            title: l.title,
            summary: l.summary ?? null,
            content: l.content,
            language: (l.language as never) ?? null,
            estimatedMinutes: l.minutes ?? 10,
            sortOrder: li,
          })
          .returning();
        if (l.exercise) {
          await db.insert(exercises).values({
            lessonId: lesson.id,
            title: l.exercise.title,
            instructions: l.exercise.instructions,
            language: l.exercise.language as never,
            starterCode: l.exercise.starterCode ?? null,
            expectedBehavior: l.exercise.expectedBehavior ?? null,
            sortOrder: 0,
          });
        }
      }
    }
  }
  log.push(`courses: ${courseBy.size} (${ALL_COURSES.filter((c) => c.status === "published").length} published, ${ALL_COURSES.filter((c) => c.status === "draft").length} draft)`);

  // ── 5. Learning paths ───────────────────────────────────────────────────
  for (const p of LEARNING_PATHS) {
    const [path] = await db
      .insert(learningPaths)
      .values({ title: p.title, slug: p.slug, description: p.description, sortOrder: 0 })
      .onConflictDoNothing({ target: learningPaths.slug })
      .returning();
    if (!path) continue;
    for (let i = 0; i < p.courseSlugs.length; i++) {
      const courseId = courseBy.get(p.courseSlugs[i]);
      if (!courseId) continue;
      await db
        .insert(learningPathCourses)
        .values({ learningPathId: path.id, courseId, sortOrder: i })
        .onConflictDoNothing({ target: [learningPathCourses.learningPathId, learningPathCourses.courseId] });
    }
  }
  log.push(`learning paths: ${LEARNING_PATHS.length}`);

  // ── 6. Instructor assignments ───────────────────────────────────────────
  for (const a of INSTRUCTOR_ASSIGNMENTS) {
    const userId = userBy.get(a.username)?.id;
    const courseId = courseBy.get(a.courseSlug);
    if (!userId || !courseId) continue;
    await db
      .insert(courseInstructors)
      .values({ courseId, userId, assignmentRole: a.role })
      .onConflictDoNothing({ target: [courseInstructors.courseId, courseInstructors.userId] });
  }
  log.push(`instructor assignments: ${INSTRUCTOR_ASSIGNMENTS.length}`);

  // ── 7. Quizzes ──────────────────────────────────────────────────────────
  const quizByCourse = new Map<string, { id: string; questions: { id: string; points: number; correctOptionId: string }[] }>();
  for (const seed of devQuizzes) {
    const courseId = courseBy.get(seed.courseSlug);
    if (!courseId) continue;
    const [course] = await db.select().from(courses).where(eq(courses.id, courseId)).limit(1);
    const modules = await db.select().from(lessonModules).where(eq(lessonModules.courseId, courseId));
    const [lesson] = await db
      .select()
      .from(lessons)
      .where(and(inArray(lessons.moduleId, modules.map((m) => m.id)), eq(lessons.title, seed.lessonTitle)))
      .limit(1);
    if (!course || !lesson) {
      console.warn(`[seed] quiz skipped — lesson "${seed.lessonTitle}" not found in ${seed.courseSlug}`);
      continue;
    }
    // Idempotency: a quiz with this title attached to this lesson = already seeded.
    const [existingQuiz] = await db
      .select()
      .from(quizzes)
      .where(and(eq(quizzes.lessonId, lesson.id), eq(quizzes.title, seed.title)))
      .limit(1);
    if (existingQuiz) {
      const qs = await db.select().from(questions).where(eq(questions.quizId, existingQuiz.id));
      const withOpts: { id: string; points: number; correctOptionId: string }[] = [];
      for (const q of qs) {
        const opts = await db.select().from(questionOptions).where(eq(questionOptions.questionId, q.id));
        const correct = opts.find((o) => o.isCorrect);
        withOpts.push({ id: q.id, points: q.points, correctOptionId: correct?.id ?? "" });
      }
      quizByCourse.set(seed.courseSlug, { id: existingQuiz.id, questions: withOpts });
      continue;
    }

    const [quiz] = await db
      .insert(quizzes)
      .values({
        lessonId: lesson.id,
        title: seed.title,
        description: seed.description ?? null,
        passingScore: seed.passingScore,
        maxAttempts: seed.maxAttempts,
      })
      .returning();
    if (!quiz) continue;
    const withOpts: { id: string; points: number; correctOptionId: string }[] = [];
    for (let qi = 0; qi < seed.questions.length; qi++) {
      const q = seed.questions[qi];
      const [question] = await db
        .insert(questions)
        .values({ quizId: quiz.id, type: q.type, prompt: q.prompt, explanation: q.explanation, points: 1, sortOrder: qi })
        .returning();
      let correctOptionId = "";
      for (let oi = 0; oi < q.options.length; oi++) {
        const [opt] = await db
          .insert(questionOptions)
          .values({ questionId: question.id, text: q.options[oi].text, isCorrect: q.options[oi].correct, sortOrder: oi })
          .returning();
        if (opt.isCorrect) correctOptionId = opt.id;
      }
      withOpts.push({ id: question.id, points: question.points, correctOptionId });
    }
    quizByCourse.set(seed.courseSlug, { id: quiz.id, questions: withOpts });
  }
  log.push(`quizzes: ${quizByCourse.size}`);

  // ── 8. Enrollments ──────────────────────────────────────────────────────
  const enrollmentBy = new Map<string, string>();
  for (const t of PROGRESS_TARGETS) {
    const userId = userBy.get(t.username)?.id;
    const courseId = courseBy.get(t.courseSlug);
    if (!userId || !courseId) continue;
    const key = `${userId}:${courseId}`;
    const [existing] = await db
      .select()
      .from(enrollments)
      .where(and(eq(enrollments.userId, userId), eq(enrollments.courseId, courseId)))
      .limit(1);
    if (existing) {
      enrollmentBy.set(key, existing.id);
      continue;
    }
    const [created] = await db
      .insert(enrollments)
      .values({ userId, courseId, status: "active", lastActivityAt: new Date(now.getTime() - 2 * DAY), createdAt: new Date(now.getTime() - 5 * DAY) })
      .returning();
    enrollmentBy.set(key, created.id);
  }
  log.push(`enrollments: ${enrollmentBy.size}`);

  // ── 9. Lesson progress ──────────────────────────────────────────────────
  let progressRows = 0;
  for (const t of PROGRESS_TARGETS) {
    const userId = userBy.get(t.username)?.id;
    const courseId = courseBy.get(t.courseSlug);
    if (!userId || !courseId) continue;
    const existing = await db
      .select({ lessonId: lessonProgress.lessonId })
      .from(lessonProgress)
      .where(and(eq(lessonProgress.userId, userId), inArray(lessonProgress.lessonId, await lessonIdsForCourse(courseId))));
    if (existing.length > 0) continue; // never overwrite real progress

    const modules = await db
      .select()
      .from(lessonModules)
      .where(eq(lessonModules.courseId, courseId))
      .orderBy(lessonModules.sortOrder);
    const allLessons: { id: string; moduleId: string }[] = [];
    for (const m of modules) {
      const ls = await db.select({ id: lessons.id, moduleId: lessons.moduleId }).from(lessons).where(eq(lessons.moduleId, m.id)).orderBy(lessons.sortOrder);
      allLessons.push(...ls);
    }
    const targetCount = Math.min(allLessons.length, Math.round((t.percent / 100) * allLessons.length));
    // Most recent completion ~1 day ago, stepping back 8h per lesson.
    for (let i = 0; i < targetCount; i++) {
      const l = allLessons[i];
      const completedAt = new Date(now.getTime() - DAY + i * 8 * 60 * 60 * 1000);
      await db.insert(lessonProgress).values({
        userId,
        lessonId: l.id,
        completed: true,
        completedAt,
        createdAt: completedAt,
      });
      progressRows++;
    }
  }
  log.push(`lesson progress rows: ${progressRows}`);

  // ── 10. Quiz attempts ───────────────────────────────────────────────────
  let attemptsSeeded = 0;
  for (const t of ATTEMPT_TARGETS) {
    const userId = userBy.get(t.username)?.id;
    const quizInfo = quizByCourse.get(t.courseSlug);
    if (!userId || !quizInfo) continue;
    const [quiz] = await db.select().from(quizzes).where(eq(quizzes.id, quizInfo.id)).limit(1);
    if (!quiz) continue;
    const existing = await db.select({ id: quizAttempts.id }).from(quizAttempts).where(and(eq(quizAttempts.userId, userId), eq(quizAttempts.quizId, quiz.id)));
    if (existing.length > 0) continue;

    // Build answers that achieve the target percent: first k questions correct.
    const total = quizInfo.questions.length;
    for (let a = 0; a < t.percents.length; a++) {
      const target = t.percents[a];
      const correctCount = Math.round((target / 100) * total);
      const submittedAt = new Date(now.getTime() - (3 - a) * DAY);
      const [attempt] = await db
        .insert(quizAttempts)
        .values({
          userId,
          quizId: quiz.id,
          scorePoints: correctCount,
          totalPoints: total,
          percent: target,
          passed: target >= quiz.passingScore,
          submittedAt,
        })
        .returning();
      for (let qi = 0; qi < quizInfo.questions.length; qi++) {
        const q = quizInfo.questions[qi];
        const isCorrect = qi < correctCount;
        const [opt] = await db
          .select()
          .from(questionOptions)
          .where(and(eq(questionOptions.questionId, q.id), eq(questionOptions.isCorrect, isCorrect)))
          .limit(1);
        // For a wrong answer, pick the first INCORRECT option.
        const [wrongOpt] = isCorrect
          ? await Promise.resolve([opt])
          : await db
              .select()
              .from(questionOptions)
              .where(and(eq(questionOptions.questionId, q.id), eq(questionOptions.isCorrect, false)))
              .limit(1);
        await db.insert(quizAttemptAnswers).values({
          attemptId: attempt.id,
          questionId: q.id,
          optionId: (isCorrect ? opt : wrongOpt)?.id ?? null,
          isCorrect,
        });
      }
      attemptsSeeded++;
    }
  }
  log.push(`quiz attempts: ${attemptsSeeded}`);

  // ── 11. Activity records + lastActivity sync ────────────────────────────
  for (const t of PROGRESS_TARGETS) {
    const userId = userBy.get(t.username)?.id;
    if (!userId) continue;
    const [marker] = await db.select({ id: activityRecords.id }).from(activityRecords).where(and(eq(activityRecords.userId, userId), eq(activityRecords.type, "dev_seed"))).limit(1);
    if (marker) continue;
    const [course] = await db.select({ title: courses.title }).from(courses).where(eq(courses.slug, t.courseSlug)).limit(1);
    await db.insert(activityRecords).values({
      userId,
      type: "dev_seed",
      metadata: { note: "development seed marker — rows created by db:seed" },
    });
    await db.insert(activityRecords).values({
      userId,
      type: "course_enrolled",
      entityType: "course",
      entityId: courseBy.get(t.courseSlug) ?? null,
      createdAt: new Date(now.getTime() - 5 * DAY),
    });
    if (course) {
      await db.insert(activityRecords).values({
        userId,
        type: "lesson_completed",
        entityType: "lesson",
        metadata: { lessonTitle: "recent lesson", courseTitle: course.title },
        createdAt: new Date(now.getTime() - DAY),
      });
    }
  }
  for (const t of ATTEMPT_TARGETS) {
    const userId = userBy.get(t.username)?.id;
    const quizInfo = quizByCourse.get(t.courseSlug);
    if (!userId || !quizInfo) continue;
    const [marker] = await db.select({ id: activityRecords.id }).from(activityRecords).where(and(eq(activityRecords.userId, userId), eq(activityRecords.type, "dev_seed"))).limit(1);
    if (marker) continue;
    const [quiz] = await db.select({ title: quizzes.title }).from(quizzes).where(eq(quizzes.id, quizInfo.id)).limit(1);
    if (quiz) {
      await db.insert(activityRecords).values({
        userId,
        type: "quiz_attempted",
        entityType: "quiz",
        entityId: quizInfo.id,
        metadata: { quizTitle: quiz.title, percent: t.percents[t.percents.length - 1] },
        createdAt: new Date(now.getTime() - 2 * DAY),
      });
    }
  }

  // Sync enrollment lastActivityAt to the latest learner event.
  for (const t of PROGRESS_TARGETS) {
    const userId = userBy.get(t.username)?.id;
    const courseId = courseBy.get(t.courseSlug);
    if (!userId || !courseId) continue;
    const [last] = await db
      .select({ at: lessonProgress.completedAt })
      .from(lessonProgress)
      .where(and(eq(lessonProgress.userId, userId), eq(lessonProgress.completed, true)))
      .orderBy(desc(lessonProgress.completedAt))
      .limit(1);
    const quizAt = await db
      .select({ at: quizAttempts.submittedAt })
      .from(quizAttempts)
      .where(and(eq(quizAttempts.userId, userId), eq(quizAttempts.quizId, quizByCourse.get(t.courseSlug)?.id ?? "")))
      .orderBy(desc(quizAttempts.submittedAt))
      .limit(1);
    const latest = [last?.at, quizAt?.at].filter(Boolean).sort((a, b) => +new Date(b as never) - +new Date(a as never))[0] as Date | undefined;
    if (latest) {
      await db.update(enrollments).set({ lastActivityAt: latest, updatedAt: new Date() }).where(and(eq(enrollments.userId, userId), eq(enrollments.courseId, courseId)));
    }
  }

  // ── Summary ─────────────────────────────────────────────────────────────
  console.info("\n════════════════════════════════════════════════");
  console.info("  Learnly LMS — development seed complete");
  console.info("════════════════════════════════════════════════");
  for (const line of log) console.info(`  • ${line}`);
  console.info(`\n  Dev logins (password: ${DEV_PASSWORD})`);
  for (const u of devUsers) console.info(`    ${u.role.padEnd(11)} ${u.email}`);
  console.info("\n  ⚠️  Development data only — do not use in production.\n");
}

async function lessonIdsForCourse(courseId: string): Promise<string[]> {
  const db = await getDb();
  const modules = await db.select({ id: lessonModules.id }).from(lessonModules).where(eq(lessonModules.courseId, courseId));
  if (modules.length === 0) return [];
  const rows = await db.select({ id: lessons.id }).from(lessons).where(inArray(lessons.moduleId, modules.map((m) => m.id)));
  return rows.map((r) => r.id);
}

main()
  .catch((err) => {
    console.error("[seed] failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    // Close PGlite cleanly so the data-directory lock is released.
    try {
      await closeDb();
    } catch {
      /* best effort */
    }
  });
