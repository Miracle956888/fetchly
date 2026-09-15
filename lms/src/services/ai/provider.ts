/**
 * AI provider abstraction.
 *
 * The LMS talks to an `AiTutorProvider` interface — never to a specific
 * vendor. Swapping providers (or adding a hosted model later) means writing
 * a new provider class and changing one env var; no UI or service rewrites.
 *
 * SECURITY: provider credentials (if any) are read server-side only, from
 * environment variables. Nothing here ever ships a secret to the browser.
 */
import { getEnv } from "@/lib/env";
import { LearnlyTutorProvider } from "./tutor-rules";

/** Frozen copy of the learning context the assistant answers with. */
export interface LearningContext {
  userId: string;
  course: {
    id: string;
    title: string;
    slug: string;
    difficulty: "beginner" | "intermediate" | "advanced";
  } | null;
  module: { id: string; title: string } | null;
  lesson: {
    id: string;
    title: string;
    /** Trimmed lesson content (bounded) — the grounding material for answers. */
    content: string;
    language: string | null;
    hasExercise: boolean;
    hasQuiz: boolean;
    /** True when a graded quiz is attached to this lesson — the assistant
     *  must not reveal answers for it while it is active. */
    activeGradedQuiz: boolean;
  } | null;
  progress: { percent: number; completed: number; total: number } | null;
}

export interface TutorHistoryMessage {
  role: "user" | "assistant";
  content: string;
}

export interface TutorRequest {
  userMessage: string;
  context: LearningContext;
  history: TutorHistoryMessage[];
}

export interface TutorResponse {
  reply: string;
  suggestedFollowups: string[];
  tokensIn: number;
  tokensOut: number;
}

export interface AiTutorProvider {
  /** Stable id, recorded per conversation/message for audit + usage. */
  readonly id: string;
  complete(req: TutorRequest): Promise<TutorResponse>;
}

let activeProvider: AiTutorProvider | null = null;

/**
 * Resolve the active provider. `AI_TUTOR_PROVIDER` selects the implementation
 * (default: the built-in `learnly-tutor` rule-based tutor, which needs no
 * external service). Unknown values fall back to the built-in tutor so the
 * LMS keeps working.
 */
export function getTutorProvider(): AiTutorProvider {
  if (activeProvider) return activeProvider;
  const requested = (getEnv().AI_TUTOR_PROVIDER ?? "learnly-tutor").trim().toLowerCase();
  // Future phases register additional providers here (e.g. "openai-compatible").
  // Unknown values fall back to the built-in tutor so the LMS keeps working.
  if (requested !== "learnly-tutor") {
    console.warn(`[ai] unknown AI_TUTOR_PROVIDER "${requested}" — using built-in learnly-tutor`);
  }
  activeProvider = new LearnlyTutorProvider();
  return activeProvider;
}

/** Test hook. */
export function _setTutorProviderForTests(provider: AiTutorProvider | null): void {
  activeProvider = provider;
}
