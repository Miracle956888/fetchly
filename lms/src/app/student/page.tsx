import Link from "next/link";
import { ArrowRight, BookOpen, CheckCircle2, ListChecks, Play } from "lucide-react";
import { requireRole } from "@/lib/auth/guards";
import { getStudentDashboardStats } from "@/services/student.service";
import { listMyEnrollments } from "@/services/enrollment.service";
import { getContinueLearning } from "@/services/course.service";
import { listRecentActivity } from "@/services/progress.service";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/layout/stat-card";
import { Button } from "@/components/ui/button";
import { ProgressLine } from "@/components/ui/progress";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate } from "@/lib/utils";

export default async function StudentDashboard() {
  const ctx = await requireRole(["student"], "/student");
  const user = ctx.user;

  const [stats, enrollments, continueLearning, activity] = await Promise.all([
    getStudentDashboardStats(user.id),
    listMyEnrollments(user),
    getContinueLearning(user.id, 3),
    listRecentActivity(user.id, 6),
  ]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold">
          {greeting}, {user.firstName}
        </h1>
        <p className="mt-1 text-[14px] text-ink-500">Here&apos;s where your learning stands today.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Enrolled courses" value={stats.enrolledCourses} icon={<BookOpen className="h-4 w-4" />} />
        <StatCard label="Lessons completed" value={stats.completedLessons} icon={<CheckCircle2 className="h-4 w-4" />} />
        <StatCard
          label="Quiz attempts"
          value={stats.quizAttempts}
          hint={stats.averageQuizScore != null ? `Avg score ${stats.averageQuizScore}%` : undefined}
          icon={<ListChecks className="h-4 w-4" />}
        />
        <StatCard label="Courses completed" value={stats.completedCourses} icon={<Play className="h-4 w-4" />} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* Continue learning */}
        <section aria-labelledby="continue-heading">
          <h2 id="continue-heading" className="font-display text-lg font-semibold">
            Continue learning
          </h2>
          {continueLearning.length === 0 ? (
            <EmptyState
              className="mt-4"
              icon={BookOpen}
              title="You haven't enrolled in a course yet"
              description="Browse the catalog and enroll in your first course to start tracking progress."
              action={
                <Button href="/courses">Browse courses</Button>
              }
            />
          ) : (
            <Card className="mt-4">
              <div className="divide-y divide-ink-100">
                {continueLearning.map((c) => (
                  <div key={c.course.id} className="flex items-center justify-between gap-4 px-5 py-4">
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/student/learn/${c.course.id}/${c.nextLessonId ?? ""}`}
                        className="block truncate text-[14px] font-medium text-ink-900 hover:text-brand-700"
                      >
                        {c.course.title}
                      </Link>
                      <p className="mt-0.5 truncate text-[12.5px] text-ink-500">
                        {c.nextLessonId ? `Up next: ${c.nextLessonTitle}` : "Course finished — nice work!"}
                      </p>
                      <ProgressLine value={c.percent} label="" className="mt-2 max-w-xs" />
                    </div>
                    <Button
                      href={c.nextLessonId ? `/student/learn/${c.course.id}/${c.nextLessonId}` : `/student/courses/${c.course.id}`}
                      size="sm"
                      variant="outline"
                    >
                      Resume
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </section>

        {/* My courses summary */}
        <section aria-labelledby="courses-heading">
          <div className="flex items-center justify-between">
            <h2 id="courses-heading" className="font-display text-lg font-semibold">
              My courses
            </h2>
            <Link href="/student/courses" className="inline-flex items-center gap-1 text-[13px] font-medium text-brand-700 hover:underline">
              View all <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>
          {enrollments.length === 0 ? (
            <p className="mt-4 text-[13px] text-ink-500">No enrollments yet.</p>
          ) : (
            <div className="mt-4 space-y-4">
              {enrollments.slice(0, 4).map((e) => (
                <Link key={e.id} href={`/student/courses/${e.courseId}`} className="block rounded-card border border-ink-200/80 bg-surface p-4 shadow-card transition-shadow hover:shadow-pop">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="truncate text-[14px] font-medium text-ink-900">{e.courseTitle}</p>
                    <span className="shrink-0 text-[12px] tabular-nums text-ink-500">
                      {e.completedLessons}/{e.totalLessons} lessons
                    </span>
                  </div>
                  <ProgressLine value={e.percent} label="" className="mt-2.5" />
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Recent activity */}
      <section aria-labelledby="activity-heading">
        <h2 id="activity-heading" className="font-display text-lg font-semibold">
          Recent activity
        </h2>
        {activity.length === 0 ? (
          <p className="mt-4 text-[13px] text-ink-500">
            Your learning activity (lessons completed, quizzes taken) will appear here.
          </p>
        ) : (
          <Card className="mt-4">
            <ul className="divide-y divide-ink-100">
              {activity.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-4 px-5 py-3">
                  <span className="text-[13.5px] text-ink-800">{formatActivity(a.type, a.metadata)}</span>
                  <span className="shrink-0 text-[12px] text-ink-400">{formatDate(a.createdAt)}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </section>
    </div>
  );
}

function formatActivity(type: string, metadata: Record<string, unknown> | null): string {
  switch (type) {
    case "lesson_completed":
      return `Completed lesson${metadata?.lessonTitle ? `: ${metadata.lessonTitle}` : ""}`;
    case "quiz_attempted":
      return `Quiz attempt${typeof metadata?.percent === "number" ? ` — ${metadata.percent}%${metadata?.passed ? " (passed)" : ""}` : ""}`;
    case "course_enrolled":
      return "Enrolled in a new course";
    case "user_registered":
      return "Account created — welcome!";
    default:
      return type.replace(/_/g, " ");
  }
}
