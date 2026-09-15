import Link from "next/link";
import { listCategorySections } from "@/services/category.service";
import { CourseCover } from "@/components/course/course-cover";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Categories",
  description: "Browse Learnly courses by area: front-end, back-end, databases, languages and full-stack paths.",
};

export default async function CategoriesPage() {
  const groups = await listCategorySections();
  return (
    <div className="container-page py-10">
      <p className="eyebrow">Explore</p>
      <h1 className="mt-2 text-3xl font-semibold">Course categories</h1>
      <p className="mt-2 max-w-xl text-[14px] text-ink-600">
        The platform is organized by area, so you can start where you want to be. Categories are
        managed by the platform team and grow as new courses are published.
      </p>
      <div className="mt-10 space-y-10">
        {groups.map((g) => (
          <section key={g.section} aria-labelledby={`section-${g.section}`}>
            <h2 id={`section-${g.section}`} className="flex items-baseline gap-3">
              <span className="font-display text-[17px] font-semibold text-ink-900">{g.label}</span>
              <span className="text-[12px] text-ink-400">
                {g.categories.length} topic{g.categories.length === 1 ? "" : "s"}
              </span>
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {g.categories.map((cat) => (
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
                      <h3 className="text-[15px] font-semibold text-ink-900 group-hover:text-brand-700">{cat.name}</h3>
                      <span className="text-[12px] font-medium text-ink-500">
                        {cat.courseCount > 0 ? `${cat.courseCount} course${cat.courseCount === 1 ? "" : "s"}` : "Coming soon"}
                      </span>
                    </div>
                    {cat.description && (
                      <p className="mt-1.5 line-clamp-2 text-[13px] leading-5 text-ink-500">{cat.description}</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
