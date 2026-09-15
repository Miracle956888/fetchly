import * as React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Award, BookOpen, CheckCircle2, Clock, FileCode2, ListChecks, Target, Users } from "lucide-react";
import { getPublishedCourseBySlug } from "@/services/course.service";
import { getOptionalSession } from "@/lib/auth/guards";
import { getEnrollment } from "@/services/enrollment.service";
import { Badge, difficultyVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CourseCover } from "@/components/course/course-cover";
import { CurriculumAccordion } from "@/components/course/curriculum-accordion";
import { EnrollButton } from "@/components/forms/enroll-button";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const detail = await getPublishedCourseBySlug(slug);
  if (!detail) return { title: "Course not found" };
  return { title: detail.course.title, description: detail.course.description };
}

export default async function CoursePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const detail = await getPublishedCourseBySlug(slug);
  if (!detail) notFound();

  const session = await getOptionalSession();
  let enrolled = false;
  if (session) {
    const enrollment = await getEnrollment(session.user.id, detail.course.id);
    enrolled = !!enrollment && enrollment.status !== "dropped";
  }

  const firstLesson = detail.curriculum.modules[0]?.lessons[0];
  const continueHref = session
    ? `/student/learn/${detail.course.id}/${firstLesson?.id ?? "overview"}`
    : `/register?next=${encodeURIComponent(`/courses/${slug}`)}`;

  return (
    <div className="container-page py-10">
      <nav aria-label="Breadcrumb" className="text-[13px] text-ink-500">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link href="/courses" className="hover:text-ink-900 hover:underline">
              Courses
            </Link>
          </li>
          {detail.category && (
            <>
              <li aria-hidden>/</li>
              <li>
                <Link href={`/courses?category=${detail.category.slug}`} className="hover:text-ink-900 hover:underline">
                  {detail.category.name}
                </Link>
              </li>
            </>
          )}
          <li aria-hidden>/</li>
          <li aria-current="page" className="text-ink-800">
            {detail.course.title}
          </li>
        </ol>
      </nav>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_340px]">
        {/* Main column */}
        <div className="min-w-0">
          <div className="overflow-hidden rounded-card border border-ink-200/80 bg-surface shadow-card">
            <div className="h-40">
              <CourseCover title={detail.course.title} category={detail.category?.name ?? "General"} />
            </div>
            <div className="p-6 sm:p-8">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={difficultyVariant[detail.course.difficulty]}>{detail.course.difficulty}</Badge>
                {detail.category && <Badge variant="outline">{detail.category.name}</Badge>}
                {detail.course.durationHours != null && (
                  <Badge variant="outline">~{detail.course.durationHours} hours</Badge>
                )}
                <Badge variant="outline">
                  <Users className="h-3 w-3" aria-hidden />
                  {detail.enrollmentsCount} enrolled
                </Badge>
              </div>
              <h1 className="mt-4 text-3xl font-semibold leading-tight">{detail.course.title}</h1>
              <p className="mt-3 text-[15px] leading-7 text-ink-600">{detail.course.description}</p>
              {detail.instructorNames.length > 0 && (
                <p className="mt-4 text-[13px] text-ink-500">
                  Taught by <span className="font-medium text-ink-800">{detail.instructorNames.join(", ")}</span>
                </p>
              )}

              {detail.course.longDescription && (
                <p className="mt-6 text-[14.5px] leading-7 text-ink-700">{detail.course.longDescription}</p>
              )}

              {(detail.course.learningObjectives.length > 0 || detail.course.prerequisites.length > 0) && (
                <div className="mt-8 grid gap-6 md:grid-cols-2">
                  {detail.course.learningObjectives.length > 0 && (
                    <div>
                      <h2 className="flex items-center gap-2 text-[14px] font-semibold text-ink-900">
                        <Target className="h-4 w-4 text-brand-600" aria-hidden />
                        What you&apos;ll learn
                      </h2>
                      <ul className="mt-3 space-y-2">
                        {detail.course.learningObjectives.map((o) => (
                          <li key={o} className="flex items-start gap-2 text-[13.5px] leading-5 text-ink-700">
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success-600" aria-hidden />
                            {o}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {detail.course.prerequisites.length > 0 && (
                    <div>
                      <h2 className="flex items-center gap-2 text-[14px] font-semibold text-ink-900">
                        <BookOpen className="h-4 w-4 text-brand-600" aria-hidden />
                        Prerequisites
                      </h2>
                      <ul className="mt-3 space-y-2">
                        {detail.course.prerequisites.map((p) => (
                          <li key={p} className="flex items-start gap-2 text-[13.5px] leading-5 text-ink-700">
                            <span className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-ink-400" aria-hidden />
                            {p}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              <h2 className="mt-10 text-xl font-semibold">Course content</h2>
              <div className="mt-4">
                <CurriculumAccordion
                  curriculum={detail.curriculum}
                  enrollHref={enrolled || session ? continueHref : undefined}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Enrollment card */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-card border border-ink-200/80 bg-surface p-6 shadow-card">
            <h2 className="font-display text-lg font-semibold text-ink-900">Enroll in this course</h2>
            <p className="mt-1.5 text-[13px] text-ink-500">
              Free to enroll. Learn at your own pace — your progress is saved automatically.
            </p>
            <div className="mt-5">
              {session ? (
                <EnrollButton courseId={detail.course.id} enrolled={enrolled} nextHref={continueHref} />
              ) : (
                <div className="flex flex-col gap-2">
                  <Button href={`/register?next=${encodeURIComponent(`/courses/${slug}`)}`} size="lg" className="w-full">
                    Enroll for free
                  </Button>
                  <Button href={`/login?next=${encodeURIComponent(`/courses/${slug}`)}`} variant="outline" size="lg" className="w-full">
                    I already have an account
                  </Button>
                </div>
              )}
            </div>
            <dl className="mt-6 space-y-3 border-t border-ink-100 pt-5 text-[13px]">
              <div className="flex items-center justify-between">
                <dt className="flex items-center gap-2 text-ink-500">
                  <BookOpen className="h-4 w-4" aria-hidden /> Lessons
                </dt>
                <dd className="font-medium text-ink-800">{detail.curriculum.totalLessons}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="flex items-center gap-2 text-ink-500">
                  <FileCode2 className="h-4 w-4" aria-hidden /> Practice exercises
                </dt>
                <dd className="font-medium text-ink-800">
                  {detail.curriculum.modules.flatMap((m) => m.lessons).filter((l) => l.hasExercise).length}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="flex items-center gap-2 text-ink-500">
                  <ListChecks className="h-4 w-4" aria-hidden /> Quizzes
                </dt>
                <dd className="font-medium text-ink-800">
                  {detail.curriculum.modules.flatMap((m) => m.lessons).filter((l) => l.hasQuiz).length}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="flex items-center gap-2 text-ink-500">
                  <Clock className="h-4 w-4" aria-hidden /> Time to complete
                </dt>
                <dd className="font-medium text-ink-800">
                  ~{Math.floor(detail.curriculum.totalMinutes / 60)}h {detail.curriculum.totalMinutes % 60}m
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="flex items-center gap-2 text-ink-500">
                  <Award className="h-4 w-4" aria-hidden /> Certificate
                </dt>
                <dd className="font-medium text-ink-800">On completion</dd>
              </div>
            </dl>
          </div>
        </aside>
      </div>
    </div>
  );
}
