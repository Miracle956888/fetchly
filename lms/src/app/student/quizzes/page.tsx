import { ListChecks } from "lucide-react";
import { requireRole } from "@/lib/auth/guards";
import { listQuizzesForUser } from "@/services/quiz.service";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState, PhaseNote } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";

export default async function StudentQuizzesPage() {
  const ctx = await requireRole(["student"], "/student");
  const quizzes = await listQuizzesForUser(ctx.user);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Quizzes</h1>
        <p className="mt-1 text-[14px] text-ink-500">
          All quizzes across your enrolled courses, with your attempt history.
        </p>
      </div>

      {quizzes.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="No quizzes yet"
          description="Quizzes appear here once you enroll in courses that contain them."
          action={<Button href="/courses">Browse courses</Button>}
        />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            {quizzes.map((q) => (
              <Card key={q.id}>
                <CardContent className="space-y-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[14.5px] font-medium text-ink-900">{q.title}</p>
                      <p className="mt-0.5 text-[12.5px] text-ink-500">
                        {q.courseTitle} · {q.lessonTitle}
                      </p>
                    </div>
                    {q.lastPassed === null ? (
                      <Badge variant="neutral">Not attempted</Badge>
                    ) : q.lastPassed ? (
                      <Badge variant="success">Passed</Badge>
                    ) : (
                      <Badge variant="warning">Retake available</Badge>
                    )}
                  </div>
                  <dl className="grid grid-cols-3 gap-2 border-t border-ink-100 pt-3 text-center">
                    <div>
                      <dt className="text-[11px] uppercase tracking-wider text-ink-400">Questions</dt>
                      <dd className="mt-0.5 text-[13px] font-semibold text-ink-900">{q.questionCount}</dd>
                    </div>
                    <div>
                      <dt className="text-[11px] uppercase tracking-wider text-ink-400">Attempts</dt>
                      <dd className="mt-0.5 text-[13px] font-semibold text-ink-900">
                        {q.attempts}/{q.maxAttempts}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[11px] uppercase tracking-wider text-ink-400">Best</dt>
                      <dd className="mt-0.5 text-[13px] font-semibold text-ink-900">
                        {q.bestPercent != null ? `${q.bestPercent}%` : "—"}
                      </dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>
            ))}
          </div>
          <PhaseNote feature="the interactive quiz-taking flow (questions, scoring, attempt limits and history are already implemented and tested server-side)" />
        </>
      )}
    </div>
  );
}
