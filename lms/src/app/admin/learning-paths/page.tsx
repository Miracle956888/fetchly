import { Route } from "lucide-react";
import { listLearningPaths } from "@/services/admin.service";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState, PhaseNote } from "@/components/ui/empty-state";

export const dynamic = "force-dynamic";

export default async function AdminLearningPathsPage() {
  const paths = await listLearningPaths();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Learning paths</h1>
        <p className="mt-1 text-[14px] text-ink-500">Ordered course collections that guide students through a subject.</p>
      </div>

      {paths.length === 0 ? (
        <EmptyState icon={Route} title="No learning paths yet" description="Create your first path to group related courses into an ordered journey." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {paths.map((p) => (
            <Card key={p.id}>
              <CardContent>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[14.5px] font-semibold text-ink-900">{p.title}</p>
                  <span className="text-[12px] text-ink-500">{p.courseCount} courses</span>
                </div>
                {p.description && <p className="mt-1.5 text-[12.5px] text-ink-500">{p.description}</p>}
                <p className="mt-2 font-mono text-[11px] text-ink-400">/{p.slug}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <PhaseNote feature="building and editing learning paths from the admin portal" />
    </div>
  );
}
