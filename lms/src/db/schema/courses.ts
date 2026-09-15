import { integer, jsonb, pgEnum, pgTable, text, timestamp, index, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { categories } from "./categories";
import { users } from "./users";

export const courseStatusEnum = pgEnum("course_status", ["draft", "published", "archived"]);
export const courseDifficultyEnum = pgEnum("course_difficulty", ["beginner", "intermediate", "advanced"]);
export const instructorAssignmentEnum = pgEnum("instructor_assignment", ["lead", "instructor"]);

export const courses = pgTable(
  "courses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    slug: text("slug").notNull().unique(),
    /** Short description shown on cards and lists. */
    description: text("description").notNull(),
    longDescription: text("long_description"),
    thumbnailUrl: text("thumbnail_url"),
    categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
    difficulty: courseDifficultyEnum("difficulty").notNull().default("beginner"),
    /** Estimated total learning time in hours. */
    durationHours: integer("duration_hours"),
    status: courseStatusEnum("status").notNull().default("draft"),
    /** JSON: string[] of learning objectives. */
    learningObjectives: jsonb("learning_objectives").$type<string[]>().notNull().default([]),
    /** JSON: string[] of prerequisites. */
    prerequisites: jsonb("prerequisites").$type<string[]>().notNull().default([]),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("courses_category_id_idx").on(t.categoryId),
    index("courses_status_idx").on(t.status),
    index("courses_difficulty_idx").on(t.difficulty),
  ],
);

// Instructor ↔ course assignment. An instructor may teach multiple courses;
// a course may have multiple instructors. Row-scoped authorization for
// instructors is enforced against this table on every request.
export const courseInstructors = pgTable(
  "course_instructors",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** 'lead' owns the course; 'instructor' is a contributing teacher. */
    assignmentRole: instructorAssignmentEnum("assignment_role").notNull().default("instructor"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("course_instructors_course_user_uq").on(t.courseId, t.userId),
    index("course_instructors_user_id_idx").on(t.userId),
  ],
);
