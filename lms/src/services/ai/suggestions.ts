/**
 * Context-sensitive suggested questions.
 *
 * Suggested chips are derived from the ACTUAL lesson (topic, first heading,
 * language, exercise/quiz flags) — never a fixed generic list. The tutor
 * rotates them slightly per request so they don't feel canned.
 */
import type { LearningContext } from "./provider";

export function suggestedQuestionsFor(context: LearningContext): string[] {
  const lesson = context.lesson;
  const course = context.course;
  const topic = lesson?.title ?? course?.title ?? null;
  const topicLower = topic ? topic.toLowerCase() : "this topic";
  const topicPlain = topic ? topic.replace(/[?!]+\s*$/, "").toLowerCase() : "this topic";

  const out: string[] = [];

  if (topic) {
    // Lesson titles that are already questions ("What is HTML?") would produce
    // "What is what is html?" — use a phrasing that reads naturally for both.
    const isQuestion = /^(what|why|how|can|is|are|do|does)\b/i.test(topicPlain) || /\?\s*$/.test(topic);
    out.push(isQuestion ? `Explain “${topic}” in simple words.` : `What is ${topicLower}?`);
  }
  if (lesson?.hasQuiz && lesson.activeGradedQuiz) {
    out.push(`What do I need to know before the ${topicLower} quiz?`);
  }
  if (topic) {
    out.push(`Why do we use ${topicLower}?`);
  }
  if (lesson?.language) {
    out.push("Can you show me a simple example?");
  }
  out.push("Give me a practice question.");
  if (lesson?.hasExercise) {
    out.push("I'm stuck on the exercise — give me a hint.");
  } else {
    out.push("Explain it with an example.");
  }
  if (context.progress && context.progress.percent > 0 && context.progress.percent < 100) {
    out.push("What should I learn before moving to the next topic?");
  }
  if (topic) {
    out.push(`What's the difference between ${topicLower} and the previous lesson's idea?`);
  }

  // Keep 4–6 chips; trim the most generic tail if over.
  return out.slice(0, 6);
}
