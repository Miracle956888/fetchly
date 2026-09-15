import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2, Clock, FileCode2, ListChecks, Play } from "lucide-react";
import { requireRole } from "@/lib/auth/guards";
import { getStudentCourseDetail } from "@/services/course.service";
import { getDb } from "@/db/client";
import { exercises, lessons, quizzes } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { LessonContent, StarterCode } from "@/components/course/lesson-content";
import { LessonCompleteButton } from "@/components/forms/lesson-complete-button";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PhaseNote } from "@/components/ui/empty-state";
import { ProgressLine } from "@/components/ui/progress";

export const dynamic = "force-dynamic";

export default async function LessonPage({ params }: { params: Promise<{ courseId: string; lessonId: string }> }) {
  const { courseId, lessonId } = await params;
  const ctx = await requireRole(["student"], "/student");

  let detail;
  try {
    detail = await getStudentCourseDetail(ctx.user.id, courseId);
  } catch {
    notFound();
  }

  const allLessons = detail.curriculum.modules.flatMap((m) => m.lessons);
  const lessonIndex = allLessons.findIndex((l) => l.id === lessonId);
  if (lessonIndex === -1) notFound();

  // "overview" deep-link → first lesson.
  if (lessonId === "overview") redirect(`/student/learn/${courseId}/${allLessons[0].id}`);

  const lesson = allLessons[lessonIndex];
  const prev = allLessons[lessonIndex - 1];
  const next = allLessons[lessonIndex + 1];
  const done = detail.progress.completedLessonIds.includes(lessonId);
  const mod = detail.curriculum.modules.find((m) => m.lessons.some((l) => l.id === lessonId));
  const moduleProgress = detail.progress.modules.find((p) => p.id === mod?.id);

  // Lesson-specific content + attached exercise/quiz (from DB, not hard-coded).
  const db = await getDb();
  const [lessonRow] = await db.select().from(lessons).where(eq(lessons.id, lesson.id)).limit(1);
  const [exercise] = await db
    .select()
    .from(exercises)
    .where(eq(exercises.lessonId, lesson.id))
    .orderBy(asc(exercises.sortOrder))
    .limit(1);
  const [quiz] = await db
    .select({ id: quizzes.id, title: quizzes.title, passingScore: quizzes.passingScore, maxAttempts: quizzes.maxAttempts })
    .from(quizzes)
    .where(eq(quizzes.lessonId, lesson.id))
    .limit(1);

  if (!lessonRow) notFound();

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="text-[13px] text-ink-500">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link href={`/student/courses/${courseId}`} className="hover:text-ink-900 hover:underline">
              {detail.course.title}
            </Link>
          </li>
          {mod && (
            <>
              <li aria-hidden>/</li>
              <li>{mod.title}</li>
            </>
          )}
          <li aria-hidden>/</li>
          <li aria-current="page" className="text-ink-800">
            {lesson.title}
          </li>
        </ol>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[1fr_260px]">
        {/* Lesson content */}
        <article className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">
              <Clock className="h-3 w-3" aria-hidden />
              {lesson.estimatedMinutes} min
            </Badge>
            {lesson.language && <Badge variant="outline">{lesson.language}</Badge>}
            {done && (
              <Badge variant="success">
                <CheckCircle2 className="h-3 w-3" aria-hidden />
                Completed
              </Badge>
            )}
          </div>
          <h1 className="mt-3 text-2xl font-semibold leading-tight sm:text-3xl">{lesson.title}</h1>
          {lesson.summary && <p className="mt-2 text-[15px] text-ink-600">{lesson.summary}</p>}

          <div className="mt-6 rounded-card border border-ink-200/80 bg-surface p-6 shadow-card sm:p-8">
            <LessonContent content={lessonRow.content} />
          </div>

          {/* Exercise (definition shown; interactive runner reserved for Phase 02) */}
          {exercise && (
            <section aria-labelledby="exercise-heading" className="mt-8">
              <h2 id="exercise-heading" className="flex items-center gap-2 font-display text-lg font-semibold">
                <FileCode2 className="h-4.5 w-4.5 text-brand-600" aria-hidden />
                Practice: {exercise.title}
              </h2>
              <p className="mt-2 max-w-2xl text-[14px] leading-6 text-ink-700">{exercise.instructions}</p>
              {exercise.starterCode && (
                <div className="mt-4">
                  <StarterCode code={exercise.starterCode} language={exercise.language} />
                </div>
              )}
              {exercise.expectedBehavior && (
                <p className="mt-4 text-[13px] text-ink-600">
                  <span className="font-semibold text-ink-800">Expected behavior:</span> {exercise.expectedBehavior}
                </p>
              )}
              <PhaseNote feature="the interactive editor + run button with a sandboxed code-execution service" className="mt-4" />
            </section>
          )}

          {/* Quiz marker */}
          {quiz && (
            <section aria-labelledby="quiz-heading" className="mt-8">
              <h2 id="quiz-heading" className="flex items-center gap-2 font-display text-lg font-semibold">
                <ListChecks className="h-4.5 w-4.5 text-brand-600" aria-hidden />
                Quiz: {quiz.title}
              </h2>
              <p className="mt-2 text-[13.5px] text-ink-600">
                Pass at {quiz.passingScore}% · up to {quiz.maxAttempts} attempts.
              </p>
              <PhaseNote feature="the interactive quiz-taking flow (questions are authored and stored; scoring is implemented and tested server-side)" className="mt-4" />
            </section>
          )}

          {/* Complete + navigation */}
          <div className="mt-10 flex flex-col gap-5 border-t border-ink-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <LessonCompleteButton lessonId={lesson.id} completed={done} courseTitle={detail.course.title} />
            <div className="flex gap-2">
              {prev ? (
                <Button href={`/student/learn/${courseId}/${prev.id}`} variant="outline">
                  <ArrowLeft className="h-4 w-4" aria-hidden />
                  {truncate(prev.title, 20)}
                </Button>
              ) : (
                <Button href={`/student/courses/${courseId}`} variant="outline">
                  <ArrowLeft className="h-4 w-4" aria-hidden />
                  Course home
                </Button>
              )}
              {next ? (
                <Button href={`/student/learn/${courseId}/${next.id}`}>
                  {truncate(next.title, 20)}
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Button>
              ) : (
                <Button href={`/student/courses/${courseId}`}>
                  Finish course <CheckCircle2 className="h-4 w-4" aria-hidden />
                </Button>
              )}
            </div>
          </div>
        </article>

        {/* Sidebar: mod progress + lesson list */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          {mod && moduleProgress && (
            <div className="rounded-card border border-ink-200/80 bg-surface p-5 shadow-card">
              <p className="text-[12px] font-semibold uppercase tracking-wider text-ink-500">Module progress</p>
              <ProgressLine value={moduleProgress.percent} label={mod.title} detail={`${moduleProgress.completed}/${moduleProgress.total}`} className="mt-3" />
              <ul className="mt-4 space-y-0.5 border-t border-ink-100 pt-3">
                {mod.lessons.map((l) => {
                  const isCurrent = l.id === lesson.id;
                  const lDone = detail.progress.completedLessonIds.includes(l.id);
                  return (
                    <li key={l.id}>
                      <Link
                        href={`/student/learn/${courseId}/${l.id}`}
                        aria-current={isCurrent ? "page" : undefined}
                        className={`flex items-center gap-2 rounded-btn px-2 py-1.5 text-[12.5px] transition-colors ${
                          isCurrent ? "bg-brand-50 font-medium text-brand-800" : "text-ink-600 hover:bg-ink-100"
                        }`}
                      >
                        {lDone ? (
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-success-600" aria-hidden />
                        ) : (
                          <Play className="h-3 w-3 shrink-0 text-ink-300" aria-hidden />
                        )}
                        <span className="truncate">{l.title}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}
