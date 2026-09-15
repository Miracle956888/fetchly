/**
 * Course catalog & curriculum service.
 *
 * All course data is fetched from the database — nothing is hard-coded in the
 * frontend. Read models are split by audience (public, student, instructor,
 * admin) and each applies its own authorization + scope.
 */
import { and, asc, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  categories,
  courseInstructors,
  courses,
  enrollments,
  exercises,
  lessonModules,
  lessons,
  lessonProgress,
  profiles,
  quizzes,
  users,
} from "@/db/schema";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { instructorCanViewStudent } from "@/lib/rbac/policies";
import { clampPercent } from "@/lib/utils";
import type { CourseListItem, CurriculumOutline } from "@/types";

export type CourseStatus = "draft" | "published" | "archived";
export type CourseDifficulty = "beginner" | "intermediate" | "advanced";

export interface CourseRow {
  id: string;
  title: string;
  slug: string;
  description: string;
  longDescription: string | null;
  thumbnailUrl: string | null;
  difficulty: CourseDifficulty;
  durationHours: number | null;
  status: CourseStatus;
  learningObjectives: string[];
  prerequisites: string[];
  createdAt: Date;
  updatedAt: Date;
}

const ENROLL_COUNT_SQL = sql<number>`(select count(*)::int from ${enrollments} where ${enrollments.courseId} = ${courses.id})`;
const LESSON_COUNT_SQL = sql<number>`(
  select count(l.id)::int from ${lessons} l
  join ${lessonModules} m on m.id = l.module_id
  where m.course_id = ${courses.id}
)`;

async function instructorNamesByCourse(courseIds: string[]): Promise<Map<string, string[]>> {
  if (courseIds.length === 0) return new Map();
  const db = await getDb();
  const rows = await db
    .select({
      courseId: courseInstructors.courseId,
      name: sql<string>`trim(${profiles.firstName} || ' ' || ${profiles.lastName})`,
    })
    .from(courseInstructors)
    .innerJoin(users, eq(users.id, courseInstructors.userId))
    .innerJoin(profiles, eq(profiles.userId, users.id))
    .where(inArray(courseInstructors.courseId, courseIds))
    .orderBy(asc(courseInstructors.assignmentRole));
  const map = new Map<string, string[]>();
  for (const r of rows) {
    const list = map.get(r.courseId) ?? [];
    if (!list.includes(r.name)) list.push(r.name);
    map.set(r.courseId, list);
  }
  return map;
}

// ─── Public catalog ────────────────────────────────────────────────────────

export interface CourseListFilter {
  category?: string; // slug
  difficulty?: CourseDifficulty;
  q?: string;
  sort: "popular" | "newest" | "title";
  page: number;
  perPage: number;
}

export async function listPublishedCourses(
  filter: CourseListFilter,
): Promise<{ rows: CourseListItem[]; total: number }> {
  const db = await getDb();

  let categoryId: string | null = null;
  if (filter.category) {
    const cat = await db.select({ id: categories.id }).from(categories).where(eq(categories.slug, filter.category)).limit(1);
    if (cat.length === 0) return { rows: [], total: 0 };
    categoryId = cat[0].id;
  }

  const where = and(
    eq(courses.status, "published"),
    categoryId ? eq(courses.categoryId, categoryId) : undefined,
    filter.difficulty ? eq(courses.difficulty, filter.difficulty) : undefined,
    filter.q
      ? or(ilike(courses.title, `%${filter.q}%`), ilike(courses.description, `%${filter.q}%`))
      : undefined,
  );

  const [countRow] = await db.select({ count: sql<number>`count(*)::int` }).from(courses).where(where).limit(1);

  const popularOrder = desc(sql`(${ENROLL_COUNT_SQL})`);
  const orderBy = filter.sort === "newest" ? desc(courses.createdAt) : filter.sort === "title" ? asc(courses.title) : popularOrder;

  const rows = await db
    .select({
      id: courses.id,
      title: courses.title,
      slug: courses.slug,
      description: courses.description,
      difficulty: courses.difficulty,
      durationHours: courses.durationHours,
      status: courses.status,
      enrollmentsCount: ENROLL_COUNT_SQL,
      lessonsCount: LESSON_COUNT_SQL,
      categoryId: categories.id,
      categoryName: categories.name,
      categorySlug: categories.slug,
    })
    .from(courses)
    .leftJoin(categories, eq(categories.id, courses.categoryId))
    .where(where)
    .orderBy(orderBy, asc(courses.title))
    .limit(filter.perPage)
    .offset((filter.page - 1) * filter.perPage);

  const names = await instructorNamesByCourse(rows.map((r) => r.id));

  return {
    rows: rows.map((r) => ({
      id: r.id,
      title: r.title,
      slug: r.slug,
      description: r.description,
      difficulty: r.difficulty,
      durationHours: r.durationHours,
      status: r.status,
      category: r.categoryId && r.categoryName && r.categorySlug
        ? { id: r.categoryId, name: r.categoryName, slug: r.categorySlug }
        : null,
      enrollmentsCount: r.enrollmentsCount,
      lessonsCount: r.lessonsCount,
      instructorNames: names.get(r.id) ?? [],
    })),
    total: countRow?.count ?? 0,
  };
}

export interface PublicCourseDetail {
  course: CourseRow;
  category: { id: string; name: string; slug: string } | null;
  instructorNames: string[];
  curriculum: CurriculumOutline;
  enrollmentsCount: number;
}

export async function getPublishedCourseBySlug(slug: string): Promise<PublicCourseDetail | null> {
  const db = await getDb();
  const [row] = await db
    .select({
      id: courses.id,
      title: courses.title,
      slug: courses.slug,
      description: courses.description,
      longDescription: courses.longDescription,
      thumbnailUrl: courses.thumbnailUrl,
      difficulty: courses.difficulty,
      durationHours: courses.durationHours,
      status: courses.status,
      learningObjectives: courses.learningObjectives,
      prerequisites: courses.prerequisites,
      createdAt: courses.createdAt,
      updatedAt: courses.updatedAt,
      categoryId: categories.id,
      categoryName: categories.name,
      categorySlug: categories.slug,
      enrollmentsCount: ENROLL_COUNT_SQL,
    })
    .from(courses)
    .leftJoin(categories, eq(categories.id, courses.categoryId))
    .where(and(eq(courses.slug, slug), eq(courses.status, "published")))
    .limit(1);

  if (!row) return null;

  const course: CourseRow = {
    id: row.id,
    title: row.title,
    slug: row.slug,
    description: row.description,
    longDescription: row.longDescription,
    thumbnailUrl: row.thumbnailUrl,
    difficulty: row.difficulty,
    durationHours: row.durationHours,
    status: row.status,
    learningObjectives: row.learningObjectives,
    prerequisites: row.prerequisites,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };

  const curriculum = await getCurriculumOutline(course.id);
  const names = await instructorNamesByCourse([course.id]);
  return {
    course,
    category: row.categoryId && row.categoryName && row.categorySlug
      ? { id: row.categoryId, name: row.categoryName, slug: row.categorySlug }
      : null,
    instructorNames: names.get(course.id) ?? [],
    curriculum,
    enrollmentsCount: row.enrollmentsCount,
  };
}

export async function getCurriculumOutline(courseId: string): Promise<CurriculumOutline> {
  const db = await getDb();
  const modules = await db
    .select()
    .from(lessonModules)
    .where(eq(lessonModules.courseId, courseId))
    .orderBy(asc(lessonModules.sortOrder), asc(lessonModules.title));

  const allLessons = modules.length
    ? await db
        .select()
        .from(lessons)
        .where(inArray(lessons.moduleId, modules.map((m) => m.id)))
        .orderBy(asc(lessons.sortOrder), asc(lessons.title))
    : [];

  const hasExercise = new Set<string>();
  const hasQuiz = new Set<string>();
  if (allLessons.length > 0) {
    const ids = allLessons.map((l) => l.id);
    const exRows = await db.select({ lessonId: exercises.lessonId }).from(exercises).where(inArray(exercises.lessonId, ids));
    for (const r of exRows) hasExercise.add(r.lessonId);
    const quizRows = await db.select({ lessonId: quizzes.lessonId }).from(quizzes).where(inArray(quizzes.lessonId, ids));
    for (const r of quizRows) hasQuiz.add(r.lessonId);
  }

  let totalLessons = 0;
  let totalMinutes = 0;
  return {
    modules: modules.map((m) => {
      const mLessons = allLessons.filter((l) => l.moduleId === m.id);
      totalLessons += mLessons.length;
      totalMinutes += mLessons.reduce((s, l) => s + l.estimatedMinutes, 0);
      return {
        id: m.id,
        title: m.title,
        description: m.description,
        sortOrder: m.sortOrder,
        lessons: mLessons.map((l) => ({
          id: l.id,
          title: l.title,
          summary: l.summary,
          estimatedMinutes: l.estimatedMinutes,
          sortOrder: l.sortOrder,
          language: l.language,
          hasExercise: hasExercise.has(l.id),
          hasQuiz: hasQuiz.has(l.id),
        })),
      };
    }),
    totalLessons,
    totalMinutes,
  };
}

// ─── Student views ─────────────────────────────────────────────────────────

export interface CourseProgressSummary {
  totalLessons: number;
  completedLessons: number;
  percent: number;
  completedLessonIds: string[];
  modules: { id: string; title: string; total: number; completed: number; percent: number }[];
}

export async function computeCourseProgress(userId: string, courseId: string, curriculum?: CurriculumOutline): Promise<CourseProgressSummary> {
  const outline = curriculum ?? (await getCurriculumOutline(courseId));
  const lessonIds = outline.modules.flatMap((m) => m.lessons.map((l) => l.id));
  const done = await getCompletedLessonIds(userId, lessonIds);

  const totalLessons = outline.totalLessons;
  const completedLessonIds = lessonIds.filter((id) => done.has(id));

  return {
    totalLessons,
    completedLessons: completedLessonIds.length,
    percent: clampPercent(completedLessonIds.length, totalLessons),
    completedLessonIds,
    modules: outline.modules.map((m) => {
      const mTotal = m.lessons.length;
      const mDone = m.lessons.filter((l) => done.has(l.id)).length;
      return { id: m.id, title: m.title, total: mTotal, completed: mDone, percent: clampPercent(mDone, mTotal) };
    }),
  };
}

export interface StudentCourseDetail {
  course: CourseRow;
  enrollment: { id: string; status: "active" | "completed" | "dropped"; enrolledAt: Date } | null;
  curriculum: CurriculumOutline;
  progress: CourseProgressSummary;
  nextLessonId: string | null;
}

export async function getStudentCourseDetail(userId: string, courseId: string): Promise<StudentCourseDetail> {
  const db = await getDb();
  const course = await getCourseRowOrThrow(courseId);

  const [enrollment] = await db
    .select()
    .from(enrollments)
    .where(and(eq(enrollments.userId, userId), eq(enrollments.courseId, courseId)))
    .limit(1);

  const enrolled = !!enrollment && enrollment.status !== "dropped";
  if (!enrolled && course.status !== "published") {
    throw new ForbiddenError("You do not have access to this course.");
  }

  const curriculum = await getCurriculumOutline(courseId);
  const progress = await computeCourseProgress(userId, courseId, curriculum);
  const nextLessonId = await computeNextLessonId(userId, courseId, curriculum);

  return {
    course,
    enrollment: enrollment ? { id: enrollment.id, status: enrollment.status, enrolledAt: enrollment.createdAt } : null,
    curriculum,
    progress,
    nextLessonId,
  };
}

async function getCompletedLessonIds(userId: string, lessonIds: string[]): Promise<Set<string>> {
  if (lessonIds.length === 0) return new Set();
  const db = await getDb();
  const rows = await db
    .select({ lessonId: lessonProgress.lessonId })
    .from(lessonProgress)
    .where(and(eq(lessonProgress.userId, userId), inArray(lessonProgress.lessonId, lessonIds), eq(lessonProgress.completed, true)));
  return new Set(rows.map((r) => r.lessonId));
}

/** First uncompleted lesson in module order (drives "continue learning"). */
export async function computeNextLessonId(userId: string, courseId: string, curriculum?: CurriculumOutline): Promise<string | null> {
  const outline = curriculum ?? (await getCurriculumOutline(courseId));
  const lessonIds = outline.modules.flatMap((m) => m.lessons.map((l) => l.id));
  if (lessonIds.length === 0) return null;
  const done = await getCompletedLessonIds(userId, lessonIds);
  for (const m of outline.modules) {
    for (const l of m.lessons) {
      if (!done.has(l.id)) return l.id;
    }
  }
  return null;
}

/**
 * Continue-learning entries for the dashboard: the most recently active
 * enrollment per course with its next lesson.
 */
export interface ContinueLearningEntry {
  course: { id: string; title: string; slug: string };
  percent: number;
  nextLessonId: string | null;
  nextLessonTitle: string | null;
  lastActivityAt: Date | null;
}

export async function getContinueLearning(userId: string, limit = 3): Promise<ContinueLearningEntry[]> {
  const db = await getDb();
  const enrRows = await db
    .select()
    .from(enrollments)
    .where(and(eq(enrollments.userId, userId), inArray(enrollments.status, ["active", "completed"])))
    .orderBy(desc(sql`coalesce(${enrollments.lastActivityAt}, ${enrollments.createdAt})`))
    .limit(limit * 2);

  const out: ContinueLearningEntry[] = [];
  for (const e of enrRows) {
    if (out.length >= limit) break;
    const [course] = await db
      .select({ id: courses.id, title: courses.title, slug: courses.slug, status: courses.status })
      .from(courses)
      .where(eq(courses.id, e.courseId))
      .limit(1);
    if (!course || (course.status !== "published" && e.status !== "completed")) continue;
    const curriculum = await getCurriculumOutline(e.courseId);
    const progress = await computeCourseProgress(userId, e.courseId, curriculum);
    const nextLessonId = await computeNextLessonId(userId, e.courseId, curriculum);
    const nextLesson = curriculum.modules.flatMap((m) => m.lessons).find((l) => l.id === nextLessonId);
    out.push({
      course: { id: course.id, title: course.title, slug: course.slug },
      percent: progress.percent,
      nextLessonId,
      nextLessonTitle: nextLesson?.title ?? null,
      lastActivityAt: e.lastActivityAt,
    });
  }
  return out;
}

// ─── Instructor views (scoped) ─────────────────────────────────────────────

export interface InstructorCourseRow {
  id: string;
  title: string;
  slug: string;
  status: CourseStatus;
  difficulty: CourseDifficulty;
  lessonsCount: number;
  studentsCount: number;
  assignmentRole: "lead" | "instructor";
}

export async function listInstructorCourses(userId: string): Promise<InstructorCourseRow[]> {
  const db = await getDb();
  return db
    .select({
      id: courses.id,
      title: courses.title,
      slug: courses.slug,
      status: courses.status,
      difficulty: courses.difficulty,
      assignmentRole: courseInstructors.assignmentRole,
      lessonsCount: LESSON_COUNT_SQL,
      studentsCount: ENROLL_COUNT_SQL,
    })
    .from(courseInstructors)
    .innerJoin(courses, eq(courses.id, courseInstructors.courseId))
    .where(eq(courseInstructors.userId, userId))
    .orderBy(asc(courses.title));
}

/** Row-scoped check: is this instructor assigned to this course? */
export async function assertInstructorAssigned(userId: string, courseId: string): Promise<void> {
  const db = await getDb();
  const [row] = await db
    .select({ id: courseInstructors.id })
    .from(courseInstructors)
    .where(and(eq(courseInstructors.userId, userId), eq(courseInstructors.courseId, courseId)))
    .limit(1);
  if (!row) throw new ForbiddenError("You are not assigned to this course.");
}

export interface InstructorStudentRow {
  userId: string;
  firstName: string;
  lastName: string;
  username: string;
  enrolledAt: Date;
  lastActivityAt: Date | null;
  status: "active" | "completed" | "dropped";
  percent: number;
}

/**
 * Students enrolled in a course the instructor is assigned to — and ONLY
 * those. The policy (lib/rbac/policies.ts) is re-checked per row here.
 */
export async function listInstructorStudents(instructorId: string, courseId: string): Promise<InstructorStudentRow[]> {
  const db = await getDb();
  const assignments = await db.select().from(courseInstructors).where(eq(courseInstructors.courseId, courseId));
  const enrolled = await db
    .select()
    .from(enrollments)
    .where(eq(enrollments.courseId, courseId))
    .orderBy(desc(enrollments.createdAt));

  const visible = enrolled.filter((e) => instructorCanViewStudent(instructorId, e.userId, courseId, assignments, e));
  if (visible.length === 0) return [];

  const curriculum = await getCurriculumOutline(courseId);

  const usersRows = await db
    .select({ user: users, profile: profiles })
    .from(users)
    .leftJoin(profiles, eq(profiles.userId, users.id))
    .where(inArray(users.id, visible.map((e) => e.userId)));

  const userMap = new Map(usersRows.map((r) => [r.user.id, r]));
  const out: InstructorStudentRow[] = [];
  for (const e of visible) {
    const u = userMap.get(e.userId);
    if (!u) continue;
    const progress = await computeCourseProgress(e.userId, courseId, curriculum);
    out.push({
      userId: e.userId,
      firstName: u.profile?.firstName ?? "",
      lastName: u.profile?.lastName ?? "",
      username: u.user.username,
      enrolledAt: e.createdAt,
      lastActivityAt: e.lastActivityAt,
      status: e.status,
      percent: progress.percent,
    });
  }
  return out;
}

export async function getInstructorStudentDetail(
  instructorId: string,
  courseId: string,
  studentId: string,
): Promise<{ student: InstructorStudentRow; progress: CourseProgressSummary; curriculum: CurriculumOutline } | null> {
  const students = await listInstructorStudents(instructorId, courseId);
  const student = students.find((s) => s.userId === studentId);
  if (!student) return null;
  const curriculum = await getCurriculumOutline(courseId);
  const progress = await computeCourseProgress(studentId, courseId, curriculum);
  return { student, progress, curriculum };
}

// ─── Admin views ───────────────────────────────────────────────────────────

export interface AdminCourseRow {
  id: string;
  title: string;
  slug: string;
  status: CourseStatus;
  difficulty: CourseDifficulty;
  categoryName: string | null;
  enrollmentsCount: number;
  lessonsCount: number;
  createdAt: Date;
}

export async function listAllCourses(filter: { status?: CourseStatus; q?: string; page: number; perPage: number }): Promise<{
  rows: AdminCourseRow[];
  total: number;
}> {
  const db = await getDb();
  const where = and(
    filter.status ? eq(courses.status, filter.status) : undefined,
    filter.q ? ilike(courses.title, `%${filter.q}%`) : undefined,
  );
  const [countRow] = await db.select({ count: sql<number>`count(*)::int` }).from(courses).where(where).limit(1);
  const rows = await db
    .select({
      id: courses.id,
      title: courses.title,
      slug: courses.slug,
      status: courses.status,
      difficulty: courses.difficulty,
      categoryName: categories.name,
      enrollmentsCount: ENROLL_COUNT_SQL,
      lessonsCount: LESSON_COUNT_SQL,
      createdAt: courses.createdAt,
    })
    .from(courses)
    .leftJoin(categories, eq(categories.id, courses.categoryId))
    .where(where)
    .orderBy(desc(courses.createdAt))
    .limit(filter.perPage)
    .offset((filter.page - 1) * filter.perPage);
  return { rows, total: countRow?.count ?? 0 };
}

export async function courseStatusCounts(): Promise<Record<CourseStatus, number>> {
  const db = await getDb();
  const rows = await db
    .select({ status: courses.status, count: sql<number>`count(*)::int` })
    .from(courses)
    .groupBy(courses.status);
  const out: Record<CourseStatus, number> = { draft: 0, published: 0, archived: 0 };
  for (const r of rows) out[r.status] = r.count;
  return out;
}

export async function getCourseRowOrThrow(id: string): Promise<CourseRow> {
  const db = await getDb();
  const [row] = await db
    .select({
      id: courses.id,
      title: courses.title,
      slug: courses.slug,
      description: courses.description,
      longDescription: courses.longDescription,
      thumbnailUrl: courses.thumbnailUrl,
      difficulty: courses.difficulty,
      durationHours: courses.durationHours,
      status: courses.status,
      learningObjectives: courses.learningObjectives,
      prerequisites: courses.prerequisites,
      createdAt: courses.createdAt,
      updatedAt: courses.updatedAt,
    })
    .from(courses)
    .where(eq(courses.id, id))
    .limit(1);
  if (!row) throw new NotFoundError("Course not found.");
  return row;
}

/** Public helper used by the enrollment flow. */
export async function getCourseStatus(id: string): Promise<CourseStatus | null> {
  const db = await getDb();
  const [row] = await db.select({ status: courses.status }).from(courses).where(eq(courses.id, id)).limit(1);
  return row?.status ?? null;
}
