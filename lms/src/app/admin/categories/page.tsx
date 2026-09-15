import { listCategoriesWithCounts } from "@/services/category.service";
import { CourseCover } from "@/components/course/course-cover";
import { Card, CardContent } from "@/components/ui/card";
import { PhaseNote } from "@/components/ui/empty-state";

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  const categories = await listCategoriesWithCounts();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Categories</h1>
        <p className="mt-1 text-[14px] text-ink-500">
          {categories.length} categories. Categories are admin-managed — the UI never hard-codes them.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((c) => (
          <Card key={c.id}>
            <div className="h-16">
              <CourseCover title={c.name} category={c.name} />
            </div>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[14.5px] font-semibold text-ink-900">{c.name}</p>
                <span className="text-[12px] text-ink-500">
                  {c.courseCount} published course{c.courseCount === 1 ? "" : "s"}
                </span>
              </div>
              {c.description && <p className="mt-1.5 line-clamp-2 text-[12.5px] text-ink-500">{c.description}</p>}
              <p className="mt-2 font-mono text-[11px] text-ink-400">/{c.slug}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <PhaseNote feature="creating, renaming and reordering categories from the admin portal" />
    </div>
  );
}
