import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Users } from "lucide-react";
import { requireRole } from "@/lib/auth/guards";
import {
  assertInstructorAssigned,
  getCurriculumOutline,
  getCourseRowOrThrow,
  listInstructorCourses,
} from "@/services/course.service";
import { Badge, difficultyVariant, statusVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PhaseNote } from "@/components/ui/empty-state";
import { Clock, FileCode2, ListChecks } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function InstructorCoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: courseId } = await params;
  const ctx = await requireRole(["instructor"], "/instructor");

  // Row-scoped authorization: 404 for unknown courses, 403 → redirect if not assigned.
  const mine = await listInstructorCourses(ctx.user.id);
  const assignment = mine.find((c) => c.id === courseId);
  if (!assignment) notFound();
  try {
    await assertInstructorAssigned(ctx.user.id, courseId);
  } catch {
    notFound();
  }

  const [course, curriculum] = await Promise.all([getCourseRowOrThrow(courseId), getCurriculumOutline(courseId)]);

  return (
    <div className="space-y-6">
      <Link href="/instructor/courses" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-500 hover:text-ink-900">
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        All courses
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-2xl font-semibold">{course.title}</h1>
            <Badge variant={statusVariant[course.status] ?? "neutral"}>{course.status}</Badge>
            <Badge variant={difficultyVariant[course.difficulty]}>{course.difficulty}</Badge>
          </div>
          <p className="mt-1.5 max-w-2xl text-[14px] text-ink-600">{course.description}</p>
        </div>
        <Button href={`/instructor/students?course=${courseId}`} variant="outline">
          <Users className="h-4 w-4" aria-hidden />
          View students ({assignment.studentsCount})
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Curriculum</CardTitle>
          <CardDescription>
            {curriculum.totalLessons} lessons across {curriculum.modules.length} modules ·{" "}
            ~{Math.floor(curriculum.totalMinutes / 60)}h {curriculum.totalMinutes % 60}m
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="divide-y divide-ink-100">
            {curriculum.modules.map((m, i) => (
              <li key={m.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[14px] font-semibold text-ink-900">
                    {i + 1}. {m.title}
                  </p>
                  <span className="text-[12px] text-ink-400">{m.lessons.length} lessons</span>
                </div>
                {m.description && <p className="mt-1 text-[12.5px] text-ink-500">{m.description}</p>}
                <ul className="mt-2 space-y-1">
                  {m.lessons.map((l) => (
                    <li key={l.id} className="flex items-center gap-2 text-[13px] text-ink-700">
                      <span className="font-mono text-[11px] text-ink-300">{String(i * 100 + l.sortOrder + 1).padStart(2, "0")}</span>
                      <span className="truncate">{l.title}</span>
                      {l.hasExercise && <FileCode2 className="h-3.5 w-3.5 text-ink-300" aria-hidden />}
                      {l.hasQuiz && <ListChecks className="h-3.5 w-3.5 text-ink-300" aria-hidden />}
                      <span className="ml-auto flex shrink-0 items-center gap-1 text-[12px] text-ink-400">
                        <Clock className="h-3 w-3" aria-hidden />
                        {l.estimatedMinutes}m
                      </span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <PhaseNote feature="creating and editing modules, lessons, exercises and quizzes from the instructor portal (the content model already stores everything)" />
    </div>
  );
}
