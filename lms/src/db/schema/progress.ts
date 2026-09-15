import { boolean, integer, pgEnum, pgTable, text, timestamp, index, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { courses } from "./courses";
import { exercises, lessons } from "./learning";
import { users } from "./users";

export const enrollmentStatusEnum = pgEnum("enrollment_status", ["active", "completed", "dropped"]);

// STUDENT ←→ COURSE, N:N. One row per (student, course); re-enrolling an
// active pair is idempotent.
export const enrollments = pgTable(
  "enrollments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    status: enrollmentStatusEnum("status").notNull().default("active"),
    lastActivityAt: timestamp("last_activity_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    droppedAt: timestamp("dropped_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("enrollments_user_course_uq").on(t.userId, t.courseId),
    index("enrollments_course_id_idx").on(t.courseId),
    index("enrollments_last_activity_idx").on(t.lastActivityAt),
  ],
);

// Per-lesson completion, scoped to the student. unique(user, lesson) keeps
// progress unambiguous even if a course is restructured.
export const lessonProgress = pgTable(
  "lesson_progress",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    lessonId: uuid("lesson_id")
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    completed: boolean("completed").notNull().default(false),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("lesson_progress_user_lesson_uq").on(t.userId, t.lessonId),
    index("lesson_progress_lesson_id_idx").on(t.lessonId),
  ],
);

// Submissions to interactive exercises (recorded once the code-execution
// engine is connected in a later phase).
export const exerciseAttempts = pgTable(
  "exercise_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    exerciseId: uuid("exercise_id")
      .notNull()
      .references(() => exercises.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    output: text("output"),
    passed: boolean("passed"),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("exercise_attempts_user_id_idx").on(t.userId),
    index("exercise_attempts_exercise_id_idx").on(t.exerciseId),
  ],
);

// Written once when a student completes a course; the source of truth for
// certificate eligibility.
export const courseCompletions = pgTable(
  "course_completions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    percent: integer("percent").notNull().default(100),
    completedAt: timestamp("completed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("course_completions_user_course_uq").on(t.userId, t.courseId)],
);

// Issued from a course completion. `code` is a human-verifiable unique ID.
export const certificates = pgTable(
  "certificates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    completionId: uuid("completion_id").references(() => courseCompletions.id, {
      onDelete: "set null",
    }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    code: text("code").notNull().unique(),
    issuedAt: timestamp("issued_at", { withTimezone: true }).notNull().defaultNow(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("certificates_user_id_idx").on(t.userId)],
);
