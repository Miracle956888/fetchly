import Link from "next/link";
import { BookOpen } from "lucide-react";
import { requireRole } from "@/lib/auth/guards";
import { listMyEnrollments } from "@/services/enrollment.service";
import { Button } from "@/components/ui/button";
import { Badge, statusVariant } from "@/components/ui/badge";
import { } from "@/components/ui/card";
import { ProgressLine } from "@/components/ui/progress";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate } from "@/lib/utils";

export default async function StudentCoursesPage() {
  const ctx = await requireRole(["student"], "/student");
  const enrollments = await listMyEnrollments(ctx.user);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold">My courses</h1>
          <p className="mt-1 text-[14px] text-ink-500">Everything you&apos;re enrolled in, with live progress.</p>
        </div>
        <Button href="/courses" variant="outline">
          Browse catalog
        </Button>
      </div>

      {enrollments.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No courses yet"
          description="Enroll in a course from the public catalog to start learning and tracking progress."
          action={<Button href="/courses">Browse courses</Button>}
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {enrollments.map((e) => (
            <Link
              key={e.id}
              href={`/student/courses/${e.courseId}`}
              className="group flex flex-col rounded-card border border-ink-200/80 bg-surface p-5 shadow-card transition-shadow hover:shadow-pop"
            >
              <div className="flex items-center justify-between gap-3">
                <h2 className="truncate text-[15px] font-semibold text-ink-900 group-hover:text-brand-700">
                  {e.courseTitle}
                </h2>
                <Badge variant={statusVariant[e.status] ?? "neutral"}>{e.status}</Badge>
              </div>
              <p className="mt-1 text-[12px] capitalize text-ink-500">
                {e.difficulty} · enrolled {formatDate(e.enrolledAt)}
              </p>
              <div className="mt-4 flex-1" />
              <ProgressLine
                value={e.percent}
                label={
                  e.totalLessons > 0
                    ? `${e.completedLessons} of ${e.totalLessons} lessons`
                    : "No lessons yet"
                }
              />
              <p className="mt-3 text-[12px] text-ink-400">
                {e.lastActivityAt ? `Last activity ${formatDate(e.lastActivityAt)}` : "No activity yet"}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
