import { boolean, integer, pgEnum, pgTable, text, timestamp, index, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { lessons } from "./learning";
import { users } from "./users";

// Question types. New types (code, fill-in-the-blank, ordering) can be added
// to this enum later without changing the attempt/scoring tables.
export const questionTypeEnum = pgEnum("question_type", ["multiple_choice", "true_false"]);

export const quizzes = pgTable(
  "quizzes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    lessonId: uuid("lesson_id")
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    /** Percentage (0–100) required to pass. */
    passingScore: integer("passing_score").notNull().default(70),
    maxAttempts: integer("max_attempts").notNull().default(3),
    timeLimitMinutes: integer("time_limit_minutes"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("quizzes_lesson_id_idx").on(t.lessonId)],
);

export const questions = pgTable(
  "questions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    quizId: uuid("quiz_id")
      .notNull()
      .references(() => quizzes.id, { onDelete: "cascade" }),
    type: questionTypeEnum("type").notNull(),
    prompt: text("prompt").notNull(),
    explanation: text("explanation"),
    points: integer("points").notNull().default(1),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("questions_quiz_id_idx").on(t.quizId)],
);

// True/false questions use exactly two option rows (True/False) so every
// question type is scored through the same option-based pipeline.
export const questionOptions = pgTable(
  "question_options",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    questionId: uuid("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    text: text("text").notNull(),
    isCorrect: boolean("is_correct").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [index("question_options_question_id_idx").on(t.questionId)],
);

export const quizAttempts = pgTable(
  "quiz_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    quizId: uuid("quiz_id")
      .notNull()
      .references(() => quizzes.id, { onDelete: "cascade" }),
    scorePoints: integer("score_points").notNull().default(0),
    totalPoints: integer("total_points").notNull().default(0),
    percent: integer("percent").notNull().default(0),
    passed: boolean("passed").notNull().default(false),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("quiz_attempts_user_id_idx").on(t.userId),
    index("quiz_attempts_quiz_id_idx").on(t.quizId),
  ],
);

export const quizAttemptAnswers = pgTable(
  "quiz_attempt_answers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    attemptId: uuid("attempt_id")
      .notNull()
      .references(() => quizAttempts.id, { onDelete: "cascade" }),
    questionId: uuid("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    optionId: uuid("option_id").references(() => questionOptions.id, { onDelete: "set null" }),
    isCorrect: boolean("is_correct").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("quiz_attempt_answers_attempt_question_uq").on(t.attemptId, t.questionId),
    index("quiz_attempt_answers_attempt_id_idx").on(t.attemptId),
  ],
);
