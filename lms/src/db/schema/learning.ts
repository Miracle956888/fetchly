import { integer, pgEnum, pgTable, text, timestamp, index, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { courses } from "./courses";

// Programming languages that lessons/exercises may target. Used by the future
// code-execution engine to pick the right sandbox runtime.
/** Union of lesson code languages (mirrors the Postgres enum). */
export type Language = (typeof languageEnum.enumValues)[number];

export const languageEnum = pgEnum("language", [
  "html",
  "css",
  "javascript",
  "typescript",
  "python",
  "cpp",
  "node",
  "sql",
  "shell",
]);

// Learning paths group ordered courses (e.g. "Front-End Foundations").
export const learningPaths = pgTable("learning_paths", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const learningPathCourses = pgTable(
  "learning_path_courses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    learningPathId: uuid("learning_path_id")
      .notNull()
      .references(() => learningPaths.id, { onDelete: "cascade" }),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [uniqueIndex("learning_path_courses_path_course_uq").on(t.learningPathId, t.courseId)],
);

// Course structure: CATEGORY → COURSE → MODULE → LESSON → PRACTICE → QUIZ
export const lessonModules = pgTable(
  "modules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("modules_course_id_idx").on(t.courseId)],
);

// Lesson content is authored as a constrained Markdown subset (headings,
// paragraphs, lists, fenced code, inline code, bold, blockquotes). It is
// rendered by a small, escaping, server-side renderer — see lib/markdown.ts.
export const lessons = pgTable(
  "lessons",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    moduleId: uuid("module_id")
      .notNull()
      .references(() => lessonModules.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    summary: text("summary"),
    content: text("content").notNull().default(""),
    language: languageEnum("language"),
    estimatedMinutes: integer("estimated_minutes").notNull().default(10),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("lessons_module_id_idx").on(t.moduleId)],
);

// Interactive practice attached to a lesson. Execution is delegated to a
// future sandboxed code-execution service (see lib/execution/contracts.ts);
// this table stores the exercise definition, not student submissions.
export const exercises = pgTable(
  "exercises",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    lessonId: uuid("lesson_id")
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    instructions: text("instructions").notNull(),
    language: languageEnum("language").notNull().default("javascript"),
    starterCode: text("starter_code"),
    expectedBehavior: text("expected_behavior"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("exercises_lesson_id_idx").on(t.lessonId)],
);
