import Link from "next/link";
import { listCategoriesWithCounts } from "@/services/category.service";
import { CourseCover } from "@/components/course/course-cover";

export const dynamic = "force-dynamic";
export const metadata = { title: "Categories" };

export default async function CategoriesPage() {
  const categories = await listCategoriesWithCounts();
  return (
    <div className="container-page py-10">
      <p className="eyebrow">Explore</p>
      <h1 className="mt-2 text-3xl font-semibold">Course categories</h1>
      <p className="mt-2 max-w-xl text-[14px] text-ink-600">
        The platform is organized by topic. Categories are managed by the platform team and grow as
        new courses are published.
      </p>
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((cat) => (
          <Link
            key={cat.id}
            href={cat.courseCount > 0 ? `/courses?category=${encodeURIComponent(cat.slug)}` : "/courses"}
            aria-disabled={cat.courseCount === 0}
            className={`group overflow-hidden rounded-card border border-ink-200/80 bg-surface shadow-card transition-shadow hover:shadow-pop ${
              cat.courseCount === 0 ? "opacity-75" : ""
            }`}
          >
            <div className="h-20">
              <CourseCover title={cat.name} category={cat.name} />
            </div>
            <div className="p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-[15px] font-semibold text-ink-900 group-hover:text-brand-700">{cat.name}</h2>
                <span className="text-[12px] font-medium text-ink-500">
                  {cat.courseCount > 0 ? `${cat.courseCount} course${cat.courseCount === 1 ? "" : "s"}` : "Coming soon"}
                </span>
              </div>
              {cat.description && <p className="mt-1.5 line-clamp-2 text-[13px] leading-5 text-ink-500">{cat.description}</p>}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
