import { ChevronLeft, ChevronRight } from "lucide-react";
import { clsx } from "../../lib/clsx";

/**
 * Server-side pagination. Builds links by rewriting the current query string —
 * no client JS needed, works in RSC.
 */
export function Pagination({
  page,
  totalPages,
  basePath,
  searchParams,
}: {
  page: number;
  totalPages: number;
  basePath: string;
  searchParams?: Record<string, string | undefined>;
}) {
  if (totalPages <= 1) return null;

  const buildHref = (target: number) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(searchParams ?? {})) {
      if (v) params.set(k, v);
    }
    params.set("page", String(target));
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  return (
    <nav aria-label="Pagination" className="mt-6 flex items-center justify-center gap-2">
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => (typeof window !== "undefined" && (window.location.href = buildHref(page - 1)))}
        className={clsx(
          "inline-flex h-8 items-center gap-1 rounded-btn border border-ink-200 bg-surface px-2.5 text-[13px] text-ink-700 transition-colors",
          "disabled:pointer-events-none disabled:opacity-40 hover:enabled:border-ink-300 hover:enabled:bg-ink-50",
        )}
      >
        <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
        Prev
      </button>
      <span className="px-2 text-[13px] tabular-nums text-ink-500" aria-live="polite">
        Page {page} of {totalPages}
      </span>
      <button
        type="button"
        disabled={page >= totalPages}
        onClick={() => (typeof window !== "undefined" && (window.location.href = buildHref(page + 1)))}
        className={clsx(
          "inline-flex h-8 items-center gap-1 rounded-btn border border-ink-200 bg-surface px-2.5 text-[13px] text-ink-700 transition-colors",
          "disabled:pointer-events-none disabled:opacity-40 hover:enabled:border-ink-300 hover:enabled:bg-ink-50",
        )}
      >
        Next
        <ChevronRight className="h-3.5 w-3.5" aria-hidden />
      </button>
    </nav>
  );
}
