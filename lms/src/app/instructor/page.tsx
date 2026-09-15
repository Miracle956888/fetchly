import Link from "next/link";
import { ArrowRight, BookOpen, Users } from "lucide-react";
import { requireRole } from "@/lib/auth/guards";
import { listInstructorCourses } from "@/services/course.service";
import { StatCard } from "@/components/layout/stat-card";
import { Badge, statusVariant } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

export default async function InstructorDashboard() {
  const ctx = await requireRole(["instructor"], "/instructor");
  const user = ctx.user;

  const courses = await listInstructorCourses(user.id);
  const totalStudents = courses.reduce((s, c) => s + c.studentsCount, 0);
  const totalLessons = courses.reduce((s, c) => s + c.lessonsCount, 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold">
          Welcome back, {user.firstName}
        </h1>
        <p className="mt-1 text-[14px] text-ink-500">An overview of the courses you teach.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Assigned courses" value={courses.length} icon={<BookOpen className="h-4 w-4" />} />
        <StatCard label="Enrolled students" value={totalStudents} icon={<Users className="h-4 w-4" />} />
        <StatCard label="Lessons authored" value={totalLessons} />
      </div>

      <section aria-labelledby="courses-heading">
        <div className="flex items-center justify-between">
          <h2 id="courses-heading" className="font-display text-lg font-semibold">
            My courses
          </h2>
          <Link href="/instructor/courses" className="inline-flex items-center gap-1 text-[13px] font-medium text-brand-700 hover:underline">
            Manage <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>
        {courses.length === 0 ? (
          <EmptyState
            className="mt-4"
            icon={BookOpen}
            title="No courses assigned yet"
            description="Course assignments are managed by the platform administrators."
          />
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((c) => (
              <Link
                key={c.id}
                href={`/instructor/courses/${c.id}`}
                className="group rounded-card border border-ink-200/80 bg-surface p-5 shadow-card transition-shadow hover:shadow-pop"
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="truncate text-[15px] font-semibold text-ink-900 group-hover:text-brand-700">{c.title}</h3>
                  <Badge variant={statusVariant[c.status] ?? "neutral"}>{c.status}</Badge>
                </div>
                <p className="mt-2 text-[12.5px] text-ink-500">
                  {c.studentsCount} students · {c.lessonsCount} lessons ·{" "}
                  <span className="capitalize">{c.assignmentRole}</span>
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
