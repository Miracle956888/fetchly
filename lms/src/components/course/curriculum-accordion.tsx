"use client";

import * as React from "react";
import Link from "next/link";
import { CheckCircle2, ChevronDown, Clock, FileCode2, ListChecks } from "lucide-react";
import { clsx } from "@/lib/clsx";
import type { CurriculumOutline } from "@/types";

/**
 * Public curriculum accordion. Expands modules to reveal lessons with
 * duration + practice/quiz markers. (Client — expand/collapse is local UI
 * state; data arrives server-rendered.)
 */
export function CurriculumAccordion({
  curriculum,
  enrollHref,
  completedLessonIds,
}: {
  curriculum: CurriculumOutline;
  enrollHref?: string;
  completedLessonIds?: Set<string>;
}) {
  const [open, setOpen] = React.useState<Record<string, boolean>>({ [curriculum.modules[0]?.id ?? ""]: true });

  const toggle = (id: string) => setOpen((o) => ({ ...o, [id]: !o[id] }));

  const totalMinutes = curriculum.totalMinutes;

  return (
    <div className="overflow-hidden rounded-card border border-ink-200/80 bg-surface shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink-100 bg-ink-50/60 px-5 py-3.5">
        <p className="text-[13px] font-semibold text-ink-900">
          {curriculum.totalLessons} lessons across {curriculum.modules.length} modules
        </p>
        <p className="inline-flex items-center gap-1.5 text-[12px] text-ink-500">
          <Clock className="h-3.5 w-3.5" aria-hidden />
          ~{Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m total
        </p>
      </div>
      <ul>
        {curriculum.modules.map((m, i) => {
          const isOpen = !!open[m.id];
          return (
            <li key={m.id} className="border-b border-ink-100 last:border-b-0">
              <button
                type="button"
                onClick={() => toggle(m.id)}
                aria-expanded={isOpen}
                aria-controls={`module-${m.id}`}
                className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-ink-50/60"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink-100 font-mono text-[11px] font-semibold text-ink-600">
                    {i + 1}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[14px] font-medium text-ink-900">{m.title}</span>
                    {m.description && (
                      <span className="mt-0.5 block truncate text-[12px] text-ink-500">{m.description}</span>
                    )}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="hidden text-[11px] text-ink-400 sm:inline">{m.lessons.length} lessons</span>
                  <ChevronDown
                    className={clsx("h-4 w-4 text-ink-400 transition-transform", isOpen && "rotate-180")}
                    aria-hidden
                  />
                </span>
              </button>
              {isOpen && (
                <ul id={`module-${m.id}`} className="bg-ink-50/30 px-5 pb-4">
                  {m.lessons.map((l, j) => {
                    const done = completedLessonIds?.has(l.id);
                    return (
                      <li key={l.id} className="flex items-center justify-between gap-3 border-t border-ink-100/80 py-2.5 first:border-t-0">
                        <span className="flex min-w-0 items-center gap-2.5">
                          {done ? (
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-success-600" aria-label="Completed" />
                          ) : (
                            <span className="h-4 w-4 shrink-0 text-right font-mono text-[11px] leading-4 text-ink-300">
                              {j + 1}.
                            </span>
                          )}
                          {enrollHref ? (
                            <Link
                              href={enrollHref}
                              className="truncate text-[13.5px] text-ink-800 hover:text-brand-700 hover:underline"
                            >
                              {l.title}
                            </Link>
                          ) : (
                            <span className="truncate text-[13.5px] text-ink-500">{l.title}</span>
                          )}
                          {l.hasExercise && (
                            <span title="Includes practice" className="inline-flex shrink-0 items-center gap-1 text-[11px] text-ink-400">
                              <FileCode2 className="h-3.5 w-3.5" aria-hidden />
                              Practice
                            </span>
                          )}
                          {l.hasQuiz && (
                            <span title="Includes quiz" className="inline-flex shrink-0 items-center gap-1 text-[11px] text-ink-400">
                              <ListChecks className="h-3.5 w-3.5" aria-hidden />
                              Quiz
                            </span>
                          )}
                        </span>
                        <span className="shrink-0 text-[12px] tabular-nums text-ink-400">{l.estimatedMinutes}m</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
