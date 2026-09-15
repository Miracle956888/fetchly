import * as React from "react";
import Link from "next/link";
import { Users } from "lucide-react";
import { CourseCover } from "../course/course-cover";

/**
 * Public course card. Data-driven (from the DB via course.service) — no
 * hard-coded courses anywhere in the UI.
 */
export function CourseCard({
  title,
  slug,
  description,
  difficulty,
  durationHours,
  lessonsCount,
  enrollmentsCount,
  category,
  instructorNames,
  progressPercent = null,
}: {
  title: string;
  slug: string;
  description: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  durationHours: number | null;
  lessonsCount: number;
  enrollmentsCount: number;
  category: { id: string; name: string; slug: string } | null;
  instructorNames: string[];
  /** Signed-in student's own progress (0–100); null when not enrolled. */
  progressPercent?: number | null;
}) {
  return (
    <Link
      href={`/courses/${slug}`}
      className="group flex flex-col overflow-hidden rounded-card border border-ink-200/80 bg-surface shadow-card transition-shadow hover:shadow-pop focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-500"
    >
      <div className="relative h-28 w-full overflow-hidden">
        <CourseCover title={title} category={category?.name ?? "General"} />
      </div>
      <div className="flex flex-1 flex-col p-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-400">
          {category?.name ?? "General"}
        </p>
        <h3 className="mt-1.5 font-display text-[16px] font-semibold leading-6 text-ink-900 transition-colors group-hover:text-brand-700">
          {title}
        </h3>
        <p className="mt-1.5 line-clamp-2 text-[13px] leading-5 text-ink-500">{description}</p>
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-ink-500">
          <span className="capitalize font-medium text-ink-700">{difficulty}</span>
          <span>{lessonsCount} lessons</span>
          {durationHours != null && <span>~{durationHours}h</span>}
          <span className="inline-flex items-center gap-1">
            <Users className="h-3 w-3" aria-hidden />
            {enrollmentsCount} enrolled
          </span>
        </div>
        {instructorNames.length > 0 && (
          <p className="mt-3 border-t border-ink-100 pt-3 text-[12px] text-ink-500">
            Taught by <span className="font-medium text-ink-700">{instructorNames.join(", ")}</span>
          </p>
        )}
        {progressPercent != null && (
          <div className="mt-3 border-t border-ink-100 pt-3">
            <div className="flex items-center justify-between text-[12px]">
              <span className="font-medium text-ink-700">Your progress</span>
              <span className="text-ink-500">{progressPercent}%</span>
            </div>
            <div
              role="progressbar"
              aria-valuenow={progressPercent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Your progress in ${title}`}
              className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink-100"
            >
              <div className="h-full rounded-full bg-brand-600" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>
        )}
      </div>
    </Link>
  );
}
