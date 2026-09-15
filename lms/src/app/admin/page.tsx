import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { requireRole } from "@/lib/auth/guards";
import { getPlatformStats, listRecentUsers } from "@/services/admin.service";
import { listPlatformActivity } from "@/services/progress.service";
import { StatCard } from "@/components/layout/stat-card";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

export default async function AdminDashboard() {
  await requireRole(["admin"], "/admin");
  const [stats, recentUsers, activity] = await Promise.all([
    getPlatformStats(),
    listRecentUsers(5),
    listPlatformActivity(8),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold">Platform overview</h1>
        <p className="mt-1 text-[14px] text-ink-500">Live statistics across users, courses and learning activity.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Students" value={stats.usersByRole.student} hint={`${stats.usersByRole.instructor} instructors · ${stats.usersByRole.admin} admins`} />
        <StatCard
          label="Courses"
          value={stats.coursesByStatus.published + stats.coursesByStatus.draft + stats.coursesByStatus.archived}
          hint={`${stats.coursesByStatus.published} published · ${stats.coursesByStatus.draft} drafts`}
        />
        <StatCard label="Active enrollments" value={stats.activeEnrollments} hint={`${stats.completions} course completions`} />
        <StatCard label="Quiz attempts" value={stats.quizAttemptsTotal} hint={`${stats.certificatesIssued} certificates issued`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent signups */}
        <section aria-labelledby="signups-heading">
          <div className="flex items-center justify-between">
            <h2 id="signups-heading" className="font-display text-lg font-semibold">
              Recent users
            </h2>
            <Link href="/admin/users" className="inline-flex items-center gap-1 text-[13px] font-medium text-brand-700 hover:underline">
              All users <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>
          <Card className="mt-4">
            <ul className="divide-y divide-ink-100">
              {recentUsers.map((r) => (
                <li key={r.user.id} className="flex items-center gap-3 px-5 py-3">
                  <Avatar firstName={r.user.firstName} lastName={r.user.lastName} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-medium text-ink-900">
                      {r.user.firstName} {r.user.lastName}
                    </p>
                    <p className="truncate text-[12px] text-ink-500">{r.user.email}</p>
                  </div>
                  <Badge variant={r.user.role === "admin" ? "danger" : r.user.role === "instructor" ? "brand" : "neutral"}>
                    {r.user.role}
                  </Badge>
                  <span className="shrink-0 text-[11.5px] text-ink-400">{formatDate(r.user.createdAt)}</span>
                </li>
              ))}
            </ul>
          </Card>
        </section>

        {/* Platform activity */}
        <section aria-labelledby="activity-heading">
          <h2 id="activity-heading" className="font-display text-lg font-semibold">
            Platform activity
          </h2>
          <Card className="mt-4">
            <ul className="divide-y divide-ink-100">
              {activity.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] text-ink-800">
                      <span className="font-medium">{a.username ?? "system"}</span> · {activityLabel(a.type)}
                    </p>
                  </div>
                  <span className="shrink-0 text-[11.5px] text-ink-400">{formatDate(a.createdAt)}</span>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      </div>
    </div>
  );
}

function activityLabel(type: string): string {
  switch (type) {
    case "lesson_completed":
      return "completed a lesson";
    case "quiz_attempted":
      return "attempted a quiz";
    case "course_enrolled":
      return "enrolled in a course";
    case "user_registered":
      return "created an account";
    default:
      return type.replace(/_/g, " ");
  }
}
