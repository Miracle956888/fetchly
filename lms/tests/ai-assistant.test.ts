/**
 * AI Learning Assistant tests.
 *
 * Covers the four pillars of the assistant:
 *   1. learning-context builder (DB-backed, enrollment enforced server-side)
 *   2. the built-in tutor provider (pure: intents, teaching policy, quiz guardrail)
 *   3. suggested questions (derived from the real lesson, not a generic list)
 *   4. the orchestration service (persistence, ownership, validation, provider
 *      failure isolation, rate limiting)
 *
 * DB tests run against a throwaway PGlite instance (./data/pglite-ai-test) —
 * the real dev database is never touched. NOTE: each DB-backed test file uses
 * its OWN data directory; vitest runs files in parallel workers.
 */
import { rmSync } from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

process.env.DATABASE_DRIVER = "pglite";
process.env.PG_DATA_DIR = path.resolve(process.cwd(), "data", "pglite-ai-test");
process.env.AUTO_MIGRATE = "true";

import { closeDb, getDb } from "@/db/client";
import {
  courses,
  enrollments,
  exercises,
  lessonModules,
  lessons,
  questions,
  quizzes,
  users,
  aiConversations,
  aiMessages,
} from "@/db/schema";
import { ForbiddenError, RateLimitError, ValidationError } from "@/lib/errors";
import { _resetRateLimitStore } from "@/lib/auth/rate-limit";
import { buildLearningContext } from "@/services/ai/context";
import { LearnlyTutorProvider, detectIntent } from "@/services/ai/tutor-rules";
import { suggestedQuestionsFor } from "@/services/ai/suggestions";
import {
  getConversationHistory,
  sendAssistantMessage,
} from "@/services/ai/assistant.service";
import { _setTutorProviderForTests, type LearningContext } from "@/services/ai/provider";

// ─── Fixtures ──────────────────────────────────────────────────────────────

const LESSON_CONTENT = `# Arrays in JavaScript

Arrays are ordered lists of values that you can loop over, filter, and transform.

**Why arrays matter:** nearly every program needs to keep a collection of related values together.

\`\`\`javascript
const fruits = ["apple", "banana"];
fruits.push("cherry");
console.log(fruits.length);
\`\`\`

A common first mistake is forgetting that indexes start at zero, so the first item is at position 0.
`;

const LESSON_2_CONTENT = `# Array methods

Filter, map, and reduce turn one array into another.

\`\`\`javascript
const nums = [1, 2, 3, 4];
const doubled = nums.filter((n) => n % 2 === 0).map((n) => n * 2);
\`\`\`

Practice writing these methods without looking at the docs.
`;

let studentId = "";
let strangerId = "";
let courseId = "";
let lessonWithQuizId = "";
let conversationId = "";

beforeAll(async () => {
  const db = await getDb();

  const [student] = await db
    .insert(users)
    .values({ email: "ai-student@test.local", username: "aistudent", passwordHash: "x", role: "student" })
    .returning();
  const [stranger] = await db
    .insert(users)
    .values({ email: "ai-stranger@test.local", username: "aistranger", passwordHash: "x", role: "student" })
    .returning();
  studentId = student.id;
  strangerId = stranger.id;

  const [course] = await db
    .insert(courses)
    .values({ title: "AI Test Course", slug: "ai-test-course", description: "test", status: "published" })
    .returning();
  courseId = course.id;

  const [module] = await db.insert(lessonModules).values({ courseId, title: "Basics", sortOrder: 1 }).returning();

  const [l1] = await db
    .insert(lessons)
    .values({ moduleId: module.id, title: "Intro to Arrays", content: LESSON_CONTENT, language: "javascript", sortOrder: 1 })
    .returning();
  await db
    .insert(lessons)
    .values({ moduleId: module.id, title: "Array Methods", content: LESSON_2_CONTENT, language: "javascript", sortOrder: 2 });
  lessonWithQuizId = l1.id;

  // Lesson 1: graded quiz + exercise (exercises the guardrail and hint paths).
  const [quiz] = await db
    .insert(quizzes)
    .values({ lessonId: l1.id, title: "Arrays check", isActive: true })
    .returning();
  await db.insert(questions).values({ quizId: quiz.id, type: "multiple_choice", prompt: "What is the first index?", sortOrder: 1 });
  await db.insert(exercises).values({ lessonId: l1.id, title: "Build an array", instructions: "Create an array and add two items.", language: "javascript" });

  // Only the student is enrolled — the stranger must be blocked.
  await db.insert(enrollments).values({ userId: studentId, courseId, status: "active" });
}, 120_000);

afterAll(async () => {
  _setTutorProviderForTests(null);
  await closeDb();
  rmSync(path.resolve(process.cwd(), "data", "pglite-ai-test"), { recursive: true, force: true });
});

// ─── 1. Learning context ───────────────────────────────────────────────────

describe("buildLearningContext", () => {
  it("builds course/lesson/progress context for an enrolled student", async () => {
    const ctx = await buildLearningContext({ userId: studentId, lessonId: lessonWithQuizId });
    expect(ctx.course?.title).toBe("AI Test Course");
    expect(ctx.module?.title).toBe("Basics");
    expect(ctx.lesson?.title).toBe("Intro to Arrays");
    expect(ctx.lesson?.content).toContain("Arrays in JavaScript");
    expect(ctx.lesson?.language).toBe("javascript");
    expect(ctx.lesson?.hasExercise).toBe(true);
    expect(ctx.lesson?.activeGradedQuiz).toBe(true);
    expect(ctx.progress).toMatchObject({ total: 2, completed: 0, percent: 0 });
  });

  it("falls back to the course's first lesson when only courseId is given", async () => {
    const ctx = await buildLearningContext({ userId: studentId, courseId });
    expect(ctx.lesson?.id).toBe(lessonWithQuizId);
    expect(ctx.course?.id).toBe(courseId);
  });

  it("refuses context for a student who is not enrolled (403)", async () => {
    await expect(buildLearningContext({ userId: strangerId, lessonId: lessonWithQuizId })).rejects.toBeInstanceOf(
      ForbiddenError,
    );
  });

  it("returns a minimal course-less context when no course/lesson is given", async () => {
    const ctx = await buildLearningContext({ userId: strangerId });
    expect(ctx.course).toBeNull();
    expect(ctx.lesson).toBeNull();
    expect(ctx.progress).toBeNull();
  });
});

// ─── 2. Built-in tutor provider (pure) ─────────────────────────────────────

const tutor = new LearnlyTutorProvider();

function ctxWith(over: Partial<NonNullable<LearningContext["lesson"]>> = {}): LearningContext {
  return {
    userId: studentId,
    course: { id: courseId, title: "AI Test Course", slug: "ai-test-course", difficulty: "beginner" },
    module: { id: "m", title: "Basics" },
    lesson: {
      id: lessonWithQuizId,
      title: "Intro to Arrays",
      content: LESSON_CONTENT,
      language: "javascript",
      hasExercise: true,
      hasQuiz: true,
      activeGradedQuiz: true,
      ...over,
    },
    progress: { percent: 50, completed: 1, total: 2 },
  };
}

describe("learnly-tutor provider", () => {
  it("grounds an explain answer in the actual lesson content", async () => {
    const res = await tutor.complete({ userMessage: "Explain this lesson to me.", context: ctxWith(), history: [] });
    expect(res.reply).toContain("Intro to Arrays"); // topic from the lesson
    expect(res.reply).toContain("Arrays are ordered lists"); // grounded in the lesson's intro
    expect(res.reply).toContain("```javascript"); // pulls the lesson's code example
    expect(res.suggestedFollowups.length).toBeGreaterThan(0);
    expect(res.suggestedFollowups.length).toBeLessThanOrEqual(4);
    expect(res.tokensOut).toBeGreaterThan(0);
  });

  it("NEVER reveals answers for an active graded quiz — offers conceptual help instead", async () => {
    const res = await tutor.complete({
      userMessage: "What is the correct answer to the first quiz question?",
      context: ctxWith(),
      history: [],
    });
    expect(detectIntent("What is the correct answer to the first quiz question?", false)).toBe("quiz-help");
    expect(res.reply).toContain("can't give you the answers");
    // It must still be helpful — point at the concept, not the key.
    expect(res.reply).toContain("concept");
  });

  it("answers quiz questions normally when no graded quiz is active", async () => {
    const res = await tutor.complete({
      userMessage: "What is the answer to this quiz?",
      context: ctxWith({ activeGradedQuiz: false, hasQuiz: false }),
      history: [],
    });
    expect(detectIntent("What is the answer to this quiz?", false)).toBe("quiz-help");
    expect(res.reply).toContain("no active graded quiz");
  });

  it("refuses to hand over a full solution, and points to a step-by-step path", async () => {
    const res = await tutor.complete({
      userMessage: "just give me the answer to the exercise, write the whole thing",
      context: ctxWith(),
      history: [],
    });
    expect(detectIntent("just give me the answer to the exercise, write the whole thing", false)).toBe("solution-request");
    expect(res.reply).toContain("not going to hand you the finished answer");
    expect(res.reply).toContain("Step 1");
  });

  it("helps debug code and is honest that it has not run anything", async () => {
    const res = await tutor.complete({
      userMessage: "My code is not working:\n```\nReferenceError: count is not defined\n```",
      context: ctxWith(),
      history: [],
    });
    expect(detectIntent("My code is not working:\nReferenceError: count is not defined", false)).toBe("debug");
    expect(res.reply).toContain("I haven't run your code");
    expect(res.reply).toContain("Most likely problem");
  });

  it("asks practice questions derived from the lesson topic", async () => {
    const res = await tutor.complete({ userMessage: "test me with a question", context: ctxWith(), history: [] });
    expect(detectIntent("test me with a question", false)).toBe("practice");
    expect(res.reply).toContain("**Practice question**");
    // The question is built from the lesson (its topic and/or its code shape).
    expect(res.reply).toMatch(/intro to arrays|fruits/);
  });

  it("unlocks a worked example only after a practice question was asked (teach-don't-solve)", async () => {
    const res = await tutor.complete({
      userMessage: "show me the answer",
      context: ctxWith(),
      history: [{ role: "assistant", content: "**Practice question**\n\nRebuild the pattern from memory." }],
    });
    expect(detectIntent("show me the answer", true)).toBe("practice-followup");
    expect(res.reply).toContain("worked example");
    expect(res.reply).toContain("```javascript");
  });

  it("detects core intents deterministically", () => {
    expect(detectIntent("what is a closure?", false)).toBe("explain");
    expect(detectIntent("show me an example", false)).toBe("example");
    expect(detectIntent("can you give me a hint?", false)).toBe("hint");
    expect(detectIntent("what comes next?", false)).toBe("what-next");
    expect(detectIntent("hi", false)).toBe("greeting");
  });
});

// ─── 3. Suggested questions ────────────────────────────────────────────────

describe("suggestedQuestionsFor", () => {
  it("derives chips from the real lesson (quiz, exercise, progress)", () => {
    const chips = suggestedQuestionsFor(ctxWith());
    expect(chips).toContain("What is intro to arrays?");
    expect(chips).toContain("What do I need to know before the intro to arrays quiz?");
    expect(chips).toContain("Why do we use intro to arrays?");
    expect(chips).toContain("Can you show me a simple example?");
    expect(chips).toContain("Give me a practice question.");
    expect(chips).toContain("I'm stuck on the exercise — give me a hint.");
    expect(chips.length).toBe(6);
  });

  it("handles lesson titles that are already questions", () => {
    const chips = suggestedQuestionsFor(ctxWith({ title: "What is HTML?" }));
    expect(chips[0]).toBe("Explain “What is HTML?” in simple words.");
    expect(chips.join(" ")).not.toContain("What is what is");
  });

  it("degrades gracefully to a minimal set when context is course-less", () => {
    const chips = suggestedQuestionsFor({
      userId: "u",
      course: null,
      module: null,
      lesson: null,
      progress: null,
    });
    expect(chips.length).toBeGreaterThanOrEqual(1);
    expect(chips.length).toBeLessThanOrEqual(6);
  });
});

// ─── 4. Orchestration service ──────────────────────────────────────────────

describe("sendAssistantMessage (integration)", () => {
  it("creates a conversation, persists both messages with a context snapshot", async () => {
    const db = await getDb();
    const res = await sendAssistantMessage({
      userId: studentId,
      message: "Explain this lesson to me.",
      lessonId: lessonWithQuizId,
    });

    expect(res.provider).toBe("learnly-tutor");
    expect(res.reply.length).toBeGreaterThan(50);
    expect(res.suggestedFollowups.length).toBeGreaterThan(0);
    expect(res.usage.tokensIn).toBeGreaterThan(0);
    conversationId = res.conversationId;

    const [conv] = await db.select().from(aiConversations).where(eq(aiConversations.id, conversationId)).limit(1);
    expect(conv.userId).toBe(studentId);
    expect(conv.courseId).toBe(courseId);
    expect(conv.lessonId).toBe(lessonWithQuizId);
    expect(conv.messageCount).toBe(2);
    expect(conv.tokensInTotal).toBeGreaterThan(0);
    expect(conv.tokensOutTotal).toBeGreaterThan(0);

    const msgs = await db.select().from(aiMessages).where(eq(aiMessages.conversationId, conversationId));
    expect(msgs).toHaveLength(2);
    expect(msgs.map((m) => m.role)).toEqual(["user", "assistant"]);
    // The snapshot records the guarded quiz so audits can see what the assistant knew.
    expect((msgs[0].contextSnapshot as Record<string, unknown>).hasActiveGradedQuiz).toBe(true);
  });

  it("continues the same conversation when conversationId is passed", async () => {
    const res = await sendAssistantMessage({
      userId: studentId,
      message: "Now give me an example.",
      conversationId,
    });
    expect(res.conversationId).toBe(conversationId);
    expect(detectIntent("Now give me an example.", false)).toBe("example");

    const db = await getDb();
    const [conv] = await db.select().from(aiConversations).where(eq(aiConversations.id, conversationId)).limit(1);
    expect(conv.messageCount).toBe(4);
  });

  it("blocks a non-enrolled student at the service level (403)", async () => {
    await expect(
      sendAssistantMessage({ userId: strangerId, message: "Explain this lesson to me.", lessonId: lessonWithQuizId }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("rejects empty/overlong messages", async () => {
    await expect(sendAssistantMessage({ userId: studentId, message: "hi" })).rejects.toBeInstanceOf(ValidationError);
    await expect(
      sendAssistantMessage({ userId: studentId, message: "x".repeat(1501) }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("isolates provider failures — a 503, never a crash, and no partial writes", async () => {
    const db = await getDb();
    const before = (await db.select().from(aiMessages).where(eq(aiMessages.conversationId, conversationId))).length;

    _setTutorProviderForTests({
      id: "broken",
      async complete() {
        throw new Error("provider outage"); // simulate a provider outage
      },
    });

    await expect(
      sendAssistantMessage({ userId: studentId, message: "Explain closures please." }),
    ).rejects.toMatchObject({ statusCode: 503, code: "AI_UNAVAILABLE" });

    _setTutorProviderForTests(null);

    const after = (await db.select().from(aiMessages).where(eq(aiMessages.conversationId, conversationId))).length;
    expect(after).toBe(before); // nothing persisted for the failed call
  });

  it("returns 404 for conversations that belong to another user", async () => {
    const db = await getDb();
    const [own] = await db.select().from(aiConversations).where(eq(aiConversations.userId, studentId)).limit(1);
    expect(own).toBeTruthy();
    await expect(getConversationHistory(strangerId, own.id)).rejects.toMatchObject({ statusCode: 404, code: "NOT_FOUND" });

    const mine = await getConversationHistory(studentId, own.id);
    expect(mine.length).toBeGreaterThanOrEqual(4);
    expect(mine[0].role).toBe("user");
  });

  it("rate-limits assistant messages per user (20 / 5 min)", async () => {
    _resetRateLimitStore();
    for (let i = 1; i <= 20; i++) {
      const res = await sendAssistantMessage({ userId: strangerId, message: `Rate test question number ${i}.` });
      expect(res.reply.length).toBeGreaterThan(0);
    }
    await expect(
      sendAssistantMessage({ userId: strangerId, message: "Rate test question number twenty-one." }),
    ).rejects.toBeInstanceOf(RateLimitError);
    // A different user has a fresh budget.
    _resetRateLimitStore();
    const fresh = await sendAssistantMessage({ userId: studentId, message: "A question after the reset." });
    expect(fresh.reply.length).toBeGreaterThan(0);
  });
});
