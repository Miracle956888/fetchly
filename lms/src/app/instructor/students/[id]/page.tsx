import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/auth/guards";
import {
  assertInstructorAssigned,
  getCourseRowOrThrow,
  getInstructorStudentDetail,
  listInstructorCourses,
} from "@/services/course.service";
import { Badge, statusVariant } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressLine } from "@/components/ui/progress";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function InstructorStudentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ course?: string }>;
}) {
  const { id: studentId } = await params;
  const { course: courseId } = await searchParams;
  const ctx = await requireRole(["instructor"], "/instructor");

  if (!courseId) redirect("/instructor/students");

  const myCourses = await listInstructorCourses(ctx.user.id);
  const isAssigned = myCourses.some((c) => c.id === courseId);
  if (!isAssigned) notFound();
  try {
    await assertInstructorAssigned(ctx.user.id, courseId);
  } catch {
    notFound();
  }

  const [course, detail] = await Promise.all([
    getCourseRowOrThrow(courseId),
    getInstructorStudentDetail(ctx.user.id, courseId, studentId),
  ]);
  if (!detail) notFound();

  const { student, progress, curriculum } = detail;

  return (
    <div className="space-y-6">
      <Link
        href={`/instructor/students${courseId ? `?course=${courseId}` : ""}`}
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-500 hover:text-ink-900"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        Back to students
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold">
            {student.firstName} {student.lastName}
          </h1>
          <p className="mt-1 text-[13px] text-ink-500">
            @{student.username} · {course.title}
          </p>
        </div>
        <Badge variant={statusVariant[student.status] ?? "neutral"}>{student.status}</Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader>
            <CardTitle>Course progress</CardTitle>
            <CardDescription>
              {progress.completedLessons} of {progress.totalLessons} lessons completed · {progress.percent}%
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-x-8 gap-y-3 md:grid-cols-2">
              {progress.modules.map((m) => (
                <ProgressLine key={m.id} value={m.percent} label={m.title} detail={`${m.completed}/${m.total}`} />
              ))}
            </div>
            <div>
              <h3 className="mb-2 text-[13px] font-semibold text-ink-900">Lesson state</h3>
              <ul className="divide-y divide-ink-100 rounded-btn border border-ink-100">
                {curriculum.modules.map((m, mi) => (
                  <li key={m.id} className="px-4 py-2.5">
                    <p className="text-[12px] font-semibold uppercase tracking-wider text-ink-400">
                      Module {mi + 1} · {m.title}
                    </p>
                    <ul className="mt-1.5 space-y-1">
                      {m.lessons.map((l) => {
                        const done = progress.completedLessonIds.includes(l.id);
                        return (
                          <li key={l.id} className="flex items-center gap-2 text-[13px]">
                            <span className={done ? "text-success-600" : "text-ink-300"} aria-label={done ? "completed" : "not completed"}>
                              {done ? "✓" : "○"}
                            </span>
                            <span className={done ? "text-ink-500" : "text-ink-800"}>{l.title}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-ink-500">Enrolled</span>
                <span className="text-[13px] font-medium text-ink-900">{formatDate(student.enrolledAt)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-ink-500">Last activity</span>
                <span className="text-[13px] font-medium text-ink-900">
                  {student.lastActivityAt ? formatDate(student.lastActivityAt) : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-ink-100 pt-3">
                <span className="text-[13px] text-ink-500">Overall</span>
                <span className="text-[13px] font-semibold tabular-nums text-ink-900">{student.percent}%</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Quiz results</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-[13px] text-ink-500">
                Quiz attempt history for this student in {course.title} arrives with the Phase 02
                analytics module (the attempt data is already recorded server-side).
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
