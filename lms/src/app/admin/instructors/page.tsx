import { listInstructorsWithCourses } from "@/services/admin.service";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminInstructorsPage() {
  const instructors = await listInstructorsWithCourses();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Instructors</h1>
        <p className="mt-1 text-[14px] text-ink-500">
          {instructors.length} instructor account{instructors.length === 1 ? "" : "s"} and their course assignments.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {instructors.map((i) => (
          <Card key={i.user.id}>
            <CardContent>
              <div className="flex items-center gap-3">
                <Avatar firstName={i.user.firstName} lastName={i.user.lastName} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14.5px] font-semibold text-ink-900">
                    {i.user.firstName} {i.user.lastName}
                  </p>
                  <p className="truncate text-[12.5px] text-ink-500">
                    @{i.user.username} · joined {formatDate(i.user.createdAt)}
                  </p>
                </div>
                <Badge variant="brand">{i.assignedCourseCount} courses</Badge>
              </div>
              {i.assignedCourses.length > 0 && (
                <ul className="mt-4 space-y-1 border-t border-ink-100 pt-3">
                  {i.assignedCourses.map((c) => (
                    <li key={c.id} className="text-[13px] text-ink-700">
                      {c.title}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
