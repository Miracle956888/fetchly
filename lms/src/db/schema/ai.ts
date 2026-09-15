import { integer, pgEnum, pgTable, text, timestamp, index, jsonb, uuid } from "drizzle-orm/pg-core";
import { courses } from "./courses";
import { lessons } from "./learning";
import { users } from "./users";

/**
 * AI Learning Assistant persistence.
 *
 * Conversations are owned by a student and optionally anchored to a course /
 * lesson (the "learning context"). Every assistant message stores a snapshot
 * of the context it was answered with, plus provider id and token usage —
 * this is what makes assistant behavior auditable and lets admins monitor AI
 * usage later.
 *
 * Retention: conversations are soft-archived (archivedAt) and eligible for
 * deletion after 90 days of inactivity (policy enforced by a future admin
 * job — Phase 03).
 */
export const aiConversations = pgTable(
  "ai_conversations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    courseId: uuid("course_id").references(() => courses.id, { onDelete: "set null" }),
    lessonId: uuid("lesson_id").references(() => lessons.id, { onDelete: "set null" }),
    title: text("title"),
    /** Which provider answered this conversation (e.g. "learnly-tutor"). */
    providerId: text("provider_id").notNull().default("learnly-tutor"),
    messageCount: integer("message_count").notNull().default(0),
    tokensInTotal: integer("tokens_in_total").notNull().default(0),
    tokensOutTotal: integer("tokens_out_total").notNull().default(0),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
  },
  (t) => [
    index("ai_conversations_user_idx").on(t.userId, t.lastMessageAt),
    index("ai_conversations_course_idx").on(t.courseId),
  ],
);

export const aiMessageRoles = pgEnum("ai_message_role", ["user", "assistant"]);

export const aiMessages = pgTable(
  "ai_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => aiConversations.id, { onDelete: "cascade" }),
    role: aiMessageRoles("role").notNull(),
    content: text("content").notNull(),
    /**
     * Frozen copy of the learning context used for THIS message:
     * { courseId, courseTitle, moduleId, moduleTitle, lessonId, lessonTitle,
     *   courseDifficulty, progressPercent, hasActiveGradedQuiz }
     */
    contextSnapshot: jsonb("context_snapshot").$type<Record<string, unknown>>(),
    tokensIn: integer("tokens_in"),
    tokensOut: integer("tokens_out"),
    latencyMs: integer("latency_ms"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("ai_messages_conversation_idx").on(t.conversationId, t.createdAt)],
);
