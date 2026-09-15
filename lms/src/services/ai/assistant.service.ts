/**
 * Assistant orchestration service.
 *
 * Flow per message:
 *   1. rate-limit (per user) + input validation
 *   2. resolve the learning context (enrollment enforced in context builder)
 *   3. load or create the conversation + recent history
 *   4. call the active provider (failure → clean error, LMS keeps working)
 *   5. persist both messages + usage totals
 */
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { aiConversations, aiMessages } from "@/db/schema";
import { AppError, ValidationError } from "@/lib/errors";
import { assertNotRateLimited } from "@/lib/auth/rate-limit";
import { buildLearningContext } from "./context";
import { getTutorProvider, type LearningContext, type TutorHistoryMessage } from "./provider";

const MESSAGE_MIN = 3;
const MESSAGE_MAX = 1500;
const HISTORY_LIMIT = 6; // recent messages sent to the provider
const RATE_LIMIT = { per: 20, windowMs: 5 * 60 * 1000 };

export interface AssistantReply {
  conversationId: string;
  reply: string;
  suggestedFollowups: string[];
  provider: string;
  usage: { tokensIn: number; tokensOut: number };
}

export interface AssistantMessageInput {
  userId: string;
  message: string;
  courseId?: string;
  lessonId?: string;
  conversationId?: string;
}

export async function sendAssistantMessage(input: AssistantMessageInput): Promise<AssistantReply> {
  const db = await getDb();
  const message = input.message.trim();

  if (message.length < MESSAGE_MIN) {
    throw new ValidationError(`Please enter at least ${MESSAGE_MIN} characters.`);
  }
  if (message.length > MESSAGE_MAX) {
    throw new ValidationError(`Your question is too long (max ${MESSAGE_MAX} characters).`);
  }

  // Abuse prevention: sliding window per user.
  assertNotRateLimited(`ai-assistant:${input.userId}`, RATE_LIMIT.per, RATE_LIMIT.windowMs);

  // Learning context (enrollment check lives in the context builder).
  const context: LearningContext = await buildLearningContext({
    userId: input.userId,
    courseId: input.courseId,
    lessonId: input.lessonId,
  });

  // Load or create conversation.
  let conversation = null as null | typeof aiConversations.$inferSelect;
  if (input.conversationId) {
    const rows = await db
      .select()
      .from(aiConversations)
      .where(and(eq(aiConversations.id, input.conversationId), eq(aiConversations.userId, input.userId)))
      .limit(1);
    conversation = rows[0] ?? null;
    if (!conversation) throw new AppError(404, "NOT_FOUND", "Conversation not found.");
  }

  // Recent history (newest → oldest, sliced, then reversed to chronological).
  let history: TutorHistoryMessage[] = [];
  if (conversation) {
    const recent = await db
      .select({ role: aiMessages.role, content: aiMessages.content })
      .from(aiMessages)
      .where(eq(aiMessages.conversationId, conversation.id))
      .orderBy(desc(aiMessages.createdAt), desc(aiMessages.id))
      .limit(HISTORY_LIMIT);
    history = recent.reverse().map((r) => ({ role: r.role, content: r.content }));
  }

  // Provider call — a failure must never crash the LMS.
  const provider = getTutorProvider();
  let replyText: string;
  let followups: string[];
  let tokensIn: number;
  let tokensOut: number;
  try {
    const result = await provider.complete({ userMessage: message, context, history });
    replyText = result.reply;
    followups = result.suggestedFollowups;
    tokensIn = result.tokensIn;
    tokensOut = result.tokensOut;
  } catch (err) {
    console.error("[ai] provider failure:", err);
    throw new AppError(503, "AI_UNAVAILABLE", "Your Learning Assistant is temporarily unavailable. Please try again shortly.");
  }

  // Persist conversation + both messages.
  const now = new Date();
  const snapshot = contextSnapshot(context);

  if (!conversation) {
    const [created] = await db
      .insert(aiConversations)
      .values({
        userId: input.userId,
        courseId: context.course?.id ?? null,
        lessonId: context.lesson?.id ?? null,
        title: context.lesson?.title ?? context.course?.title ?? null,
        providerId: provider.id,
        lastMessageAt: now,
      })
      .returning();
    conversation = created;
  }

  await db
    .update(aiConversations)
    .set({
      messageCount: sql`${aiConversations.messageCount} + 2`,
      tokensInTotal: sql`${aiConversations.tokensInTotal} + ${tokensIn}`,
      tokensOutTotal: sql`${aiConversations.tokensOutTotal} + ${tokensOut}`,
      lastMessageAt: now,
    })
    .where(eq(aiConversations.id, conversation.id));

  await db.insert(aiMessages).values([
    {
      conversationId: conversation.id,
      role: "user",
      content: message,
      contextSnapshot: snapshot,
      tokensIn,
    },
    {
      conversationId: conversation.id,
      role: "assistant",
      content: replyText,
      contextSnapshot: snapshot,
      tokensOut,
    },
  ]);

  return {
    conversationId: conversation.id,
    reply: replyText,
    suggestedFollowups: followups,
    provider: provider.id,
    usage: { tokensIn, tokensOut },
  };
}

/** Reload a user's conversation (ownership-checked). */
export async function getConversationHistory(userId: string, conversationId: string) {
  const db = await getDb();
  const [conv] = await db
    .select()
    .from(aiConversations)
    .where(and(eq(aiConversations.id, conversationId), eq(aiConversations.userId, userId)))
    .limit(1);
  if (!conv) throw new AppError(404, "NOT_FOUND", "Conversation not found.");
  return db
    .select({ content: aiMessages.content, role: aiMessages.role, createdAt: aiMessages.createdAt })
    .from(aiMessages)
    .where(eq(aiMessages.conversationId, conversationId))
    .orderBy(asc(aiMessages.createdAt), asc(aiMessages.id));
}

function contextSnapshot(context: LearningContext): Record<string, unknown> {
  return {
    courseId: context.course?.id ?? null,
    courseTitle: context.course?.title ?? null,
    courseDifficulty: context.course?.difficulty ?? null,
    moduleId: context.module?.id ?? null,
    moduleTitle: context.module?.title ?? null,
    lessonId: context.lesson?.id ?? null,
    lessonTitle: context.lesson?.title ?? null,
    progressPercent: context.progress?.percent ?? null,
    hasActiveGradedQuiz: context.lesson?.activeGradedQuiz ?? false,
  };
}
