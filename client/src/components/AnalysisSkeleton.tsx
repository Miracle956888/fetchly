import { Skeleton } from './ui/Skeleton';

/** Skeleton shown while analysis is in flight — no full-screen spinners. */
export function AnalysisSkeleton() {
  return (
    <div
      className="overflow-hidden rounded-2xl border border-line bg-card shadow-[var(--shadow-card)]"
      role="status"
      aria-label="Analyzing your link"
    >
      <p className="px-5 pt-5 text-sm font-semibold text-ink-soft sm:px-6">Analyzing your link…</p>
      <div className="flex flex-col gap-5 p-5 sm:p-6 md:flex-row">
        <Skeleton className="aspect-video w-full shrink-0 md:w-72" />
        <div className="flex-1 space-y-4">
          <div className="flex gap-2">
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/3" />
          <div className="space-y-2 pt-2">
            <Skeleton className="h-14 w-full rounded-xl" />
            <Skeleton className="h-14 w-full rounded-xl" />
            <Skeleton className="h-14 w-5/6 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
