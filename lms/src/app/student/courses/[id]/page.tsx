import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileCode2, ListChecks, Play } from "lucide-react";
import { requireRole } from "@/lib/auth/guards";
import { getStudentCourseDetail } from "@/services/course.service";
import { listQuizzesForUser } from "@/services/quiz.service";
import { Button } from "@/components/ui/button";
import { Badge, difficultyVariant } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ProgressLine } from "@/components/ui/progress";

export const dynamic = "force-dynamic";

export default async function StudentCoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: courseId } = await params;
  const ctx = await requireRole(["student"], "/student");

  let detail;
  try {
    detail = await getStudentCourseDetail(ctx.user.id, courseId);
  } catch {
    notFound();
  }

  const quizzes = (await listQuizzesForUser(ctx.user)).filter((q) => q.courseId === courseId);
  const nextLesson = detail.curriculum.modules.flatMap((m) => m.lessons).find((l) => l.id === detail.nextLessonId);
  const completed = new Set(detail.progress.completedLessonIds);

  return (
    <div className="space-y-6">
      <Link href="/student/courses" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-500 hover:text-ink-900">
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        All my courses
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-2xl font-semibold">{detail.course.title}</h1>
            <Badge variant={difficultyVariant[detail.course.difficulty]}>{detail.course.difficulty}</Badge>
          </div>
          <p className="mt-1.5 max-w-2xl text-[14px] text-ink-600">{detail.course.description}</p>
        </div>
        {detail.enrollment && (
          <Button
            href={
              detail.nextLessonId
                ? `/student/learn/${courseId}/${detail.nextLessonId}`
                : `/student/courses/${courseId}`
            }
            size="lg"
          >
            <Play className="h-4 w-4" aria-hidden />
            {detail.progress.percent >= 100 ? "Review course" : nextLesson ? `Continue: ${truncate(nextLesson.title, 28)}` : "Start course"}
          </Button>
        )}
      </div>

      {/* Progress overview */}
      <Card>
        <CardContent className="space-y-4">
          <div className="flex items-baseline justify-between">
            <p className="text-[13px] font-semibold text-ink-900">Overall progress</p>
            <p className="text-[12.5px] tabular-nums text-ink-500">
              {detail.progress.completedLessons} of {detail.progress.totalLessons} lessons · {detail.progress.percent}%
            </p>
          </div>
          <div className="grid gap-x-8 gap-y-3 md:grid-cols-2">
            {detail.progress.modules.map((m) => (
              <ProgressLine key={m.id} value={m.percent} label={m.title} detail={`${m.completed}/${m.total}`} />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Curriculum with per-lesson state */}
      <section aria-labelledby="curriculum-heading">
        <h2 id="curriculum-heading" className="font-display text-lg font-semibold">
          Curriculum
        </h2>
        <Card className="mt-4">
          <ul className="divide-y divide-ink-100">
            {detail.curriculum.modules.map((m, mi) => {
              const moduleProgress = detail.progress.modules.find((p) => p.id === m.id);
              const modulePercent = moduleProgress ? moduleProgress.percent : 0;
              return (
                <li key={m.id}>
                  <div className="flex flex-wrap items-center justify-between gap-2 bg-ink-50/60 px-5 py-3">
                    <p className="text-[13.5px] font-semibold text-ink-900">
                      Module {mi + 1} · {m.title}
                    </p>
                    <span className="text-[12px] tabular-nums text-ink-500">{modulePercent}%</span>
                  </div>
                  <ul>
                    {m.lessons.map((l) => {
                      const done = completed.has(l.id);
                      return (
                        <li key={l.id} className="border-t border-ink-100/70">
                          <Link
                            href={`/student/learn/${courseId}/${l.id}`}
                            className="flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-ink-50/60"
                          >
                            <span className="flex min-w-0 items-center gap-2.5">
                              <span
                                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                                  done ? "border-success-600 bg-success-600 text-white" : "border-ink-300 bg-surface"
                                }`}
                                aria-label={done ? "Completed" : "Not completed"}
                              >
                                {done && <CheckIcon />}
                              </span>
                              <span className={`truncate text-[13.5px] ${done ? "text-ink-500" : "text-ink-800"}`}>{l.title}</span>
                              {l.hasExercise && <FileCode2 className="h-3.5 w-3.5 shrink-0 text-ink-300" aria-hidden />}
                              {l.hasQuiz && <ListChecks className="h-3.5 w-3.5 shrink-0 text-ink-300" aria-hidden />}
                            </span>
                            <span className="shrink-0 text-[12px] tabular-nums text-ink-400">{l.estimatedMinutes}m</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              );
            })}
          </ul>
        </Card>
      </section>

      {/* Quizzes in this course */}
      <section aria-labelledby="quizzes-heading">
        <h2 id="quizzes-heading" className="font-display text-lg font-semibold">
          Quizzes
        </h2>
        {quizzes.length === 0 ? (
          <p className="mt-4 text-[13px] text-ink-500">This course has no quizzes yet.</p>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {quizzes.map((q) => (
              <Card key={q.id}>
                <CardContent className="space-y-2">
                  <p className="text-[14px] font-medium text-ink-900">{q.title}</p>
                  <p className="text-[12.5px] text-ink-500">
                    {q.questionCount} questions · pass at {q.passingScore}% · {q.attempts}/{q.maxAttempts} attempts used
                  </p>
                  {q.lastPercent != null && (
                    <p className={`text-[12.5px] font-medium ${q.lastPassed ? "text-success-700" : "text-warning-700"}`}>
                      Last score: {q.lastPercent}% {q.lastPassed ? "· passed" : "· not passed"}
                    </p>
                  )}
                  <p className="pt-1 text-[12px] text-ink-400">Interactive quiz taking arrives in Phase 02.</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" aria-hidden>
      <path d="M2.5 6.5 L4.8 8.8 L9.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}
