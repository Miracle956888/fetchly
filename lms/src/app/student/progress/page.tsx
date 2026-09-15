import Link from "next/link";
import { TrendingUp } from "lucide-react";
import { requireRole } from "@/lib/auth/guards";
import { listMyProgress } from "@/services/progress.service";
import { Button } from "@/components/ui/button";
import { Badge, statusVariant } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ProgressLine } from "@/components/ui/progress";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate } from "@/lib/utils";

export default async function StudentProgressPage() {
  const ctx = await requireRole(["student"], "/student");
  const rows = await listMyProgress(ctx.user);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Progress</h1>
        <p className="mt-1 text-[14px] text-ink-500">
          Lesson-level completion across every course you&apos;re enrolled in.
        </p>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={TrendingUp}
          title="No progress yet"
          description="Enroll in a course and complete lessons — your progress will be tracked here."
          action={<Button href="/courses">Browse courses</Button>}
        />
      ) : (
        <div className="space-y-5">
          {rows.map((r) => (
            <Card key={r.id}>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Link href={`/student/courses/${r.id}`} className="text-[15px] font-semibold text-ink-900 hover:text-brand-700">
                      {r.title}
                    </Link>
                    <Badge variant={statusVariant[r.status] ?? "neutral"}>{r.status}</Badge>
                  </div>
                  <div className="flex items-center gap-3 text-[12.5px] text-ink-500">
                    <span className="tabular-nums">
                      {r.completedLessons}/{r.totalLessons} lessons
                    </span>
                    {r.lastActivityAt && <span>· active {formatDate(r.lastActivityAt)}</span>}
                    <span className="font-semibold tabular-nums text-ink-900">{r.percent}%</span>
                  </div>
                </div>
                <div className="grid gap-x-8 gap-y-3 md:grid-cols-2 lg:grid-cols-3">
                  {r.modules.map((m, i) => (
                    <ProgressLine key={i} value={m.percent} label={m.title} />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
