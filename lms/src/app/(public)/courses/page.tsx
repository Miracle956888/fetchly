import * as React from "react";
import Link from "next/link";
import { Search, SlidersHorizontal } from "lucide-react";
import { listPublishedCourses } from "@/services/course.service";
import { listCategoriesWithCounts } from "@/services/category.service";
import { courseListQuerySchema } from "@/lib/validation/schemas";
import { CourseCard } from "@/components/course/course-card";
import { CourseCardSkeleton } from "@/components/ui/skeleton";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { Suspense } from "react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Courses" };

export default function CoursesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <div className="container-page py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Catalog</p>
          <h1 className="mt-2 text-3xl font-semibold">Courses</h1>
          <p className="mt-2 max-w-xl text-[14px] text-ink-600">
            Structured programming courses, from first principles to practical skills.
          </p>
        </div>
      </div>
      <Suspense fallback={<CatalogLoading />}>
        <CatalogList searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function CatalogList({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const raw = Object.fromEntries(Object.entries(await searchParams)) as Record<string, string>;
  const parsed = courseListQuerySchema.safeParse(raw);
  const filter = parsed.success
    ? parsed.data
    : { sort: "popular" as const, page: 1, perPage: 9 };

  const [{ rows, total }, categories] = await Promise.all([
    listPublishedCourses(filter),
    listCategoriesWithCounts(),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / filter.perPage));

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-[240px_1fr]">
      {/* Filters — plain links (server-side, no JS required) */}
      <aside aria-label="Course filters" className="space-y-6">
        <div>
          <form action="/courses" className="relative">
            <label htmlFor="catalog-q" className="sr-only">
              Search courses
            </label>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" aria-hidden />
            <input
              id="catalog-q"
              name="q"
              defaultValue={filter.q ?? ""}
              placeholder="Search courses…"
              className="h-9.5 w-full rounded-btn border border-ink-200 bg-surface pl-9 pr-3 text-sm placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </form>
        </div>
        <FilterGroup
          label="Category"
          options={categories.map((c) => ({ value: c.slug, label: c.name }))}
          current={filter.category}
        />
        <FilterGroup
          label="Difficulty"
          options={[
            { value: "beginner", label: "Beginner" },
            { value: "intermediate", label: "Intermediate" },
            { value: "advanced", label: "Advanced" },
          ]}
          current={filter.difficulty}
        />
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-500">Sort by</p>
          <div className="flex flex-col gap-1">
            {(
              [
                ["popular", "Most enrolled"],
                ["newest", "Newest"],
                ["title", "Title A–Z"],
              ] as const
            ).map(([value, label]) => (
              <FilterLink key={value} href="/courses" label={label} params={{ sort: value }} current={filter.sort === value} />
            ))}
          </div>
        </div>
      </aside>

      <div>
        <p className="text-[13px] text-ink-500" aria-live="polite">
          {total} course{total === 1 ? "" : "s"}
          {filter.category && (
            <>
              {" "}
              in <span className="font-medium text-ink-800">{filter.category}</span>
            </>
          )}
        </p>
        {rows.length === 0 ? (
          <EmptyState
            icon={SlidersHorizontal}
            title="No courses match those filters"
            description="Try clearing a filter or searching for something else."
            className="mt-4"
          />
        ) : (
          <div className="mt-4 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {rows.map((c) => (
              <CourseCard
                key={c.id}
                title={c.title}
                slug={c.slug}
                description={c.description}
                difficulty={c.difficulty}
                durationHours={c.durationHours}
                lessonsCount={c.lessonsCount}
                enrollmentsCount={c.enrollmentsCount}
                category={c.category}
                instructorNames={c.instructorNames}
              />
            ))}
          </div>
        )}
        <Pagination page={filter.page} totalPages={totalPages} basePath="/courses" searchParams={raw} />
      </div>
    </div>
  );
}

function FilterGroup({
  label,
  options,
  current,
}: {
  label: string;
  options: { value: string; label: string }[];
  current?: string;
}) {
  return (
    <div>
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-500">{label}</p>
      <div className="flex flex-col gap-1">
        <FilterLink href="/courses" label="All" current={!current} />
        {options.map((o) => (
          <FilterLink key={o.value} href="/courses" label={o.label} params={{ [label.toLowerCase()]: o.value }} current={current === o.value} />
        ))}
      </div>
    </div>
  );
}

function FilterLink({
  href,
  label,
  params,
  current,
}: {
  href: string;
  label: string;
  params?: Record<string, string>;
  current?: boolean;
}) {
  const qs = params ? `?${new URLSearchParams(params).toString()}` : "";
  return (
    <Link
      href={`${href}${qs}`}
      aria-current={current ? "true" : undefined}
      className={`-mx-2 rounded-btn px-2 py-1.5 text-[13px] font-medium transition-colors ${
        current ? "bg-brand-50 text-brand-800" : "text-ink-600 hover:bg-ink-100 hover:text-ink-900"
      }`}
    >
      {label}
    </Link>
  );
}

function CatalogLoading() {
  return (
    <div className="mt-4 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <CourseCardSkeleton key={i} />
      ))}
    </div>
  );
}
