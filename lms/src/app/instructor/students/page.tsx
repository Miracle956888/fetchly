import Link from "next/link";
import { Users } from "lucide-react";
import { requireRole } from "@/lib/auth/guards";
import {
  getCourseRowOrThrow,
  listInstructorCourses,
  listInstructorStudents,
} from "@/services/course.service";
import { clsx } from "@/lib/clsx";
import { Badge, statusVariant } from "@/components/ui/badge";
import { ProgressLine } from "@/components/ui/progress";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TBody, Td, Th, Tr, THead } from "@/components/ui/table";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function InstructorStudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ course?: string }>;
}) {
  const { course: courseId } = await searchParams;
  const ctx = await requireRole(["instructor"], "/instructor");

  const myCourses = await listInstructorCourses(ctx.user.id);
  if (myCourses.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="font-display text-2xl font-semibold">Students</h1>
        <EmptyState
          icon={Users}
          title="No courses assigned yet"
          description="Students appear here once you're assigned to courses with enrollments."
        />
      </div>
    );
  }

  // Resolve the selected course (must be one of the instructor's).
  const selectedId = myCourses.some((c) => c.id === courseId)
    ? courseId!
    : myCourses[0].id;
  const course = await getCourseRowOrThrow(selectedId);
  const students = await listInstructorStudents(ctx.user.id, selectedId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Students</h1>
        <p className="mt-1 text-[14px] text-ink-500">
          You can only see students enrolled in courses you teach.
        </p>
      </div>

      {/* Course tabs (server-rendered links) */}
      <div role="tablist" aria-label="Select course" className="flex flex-wrap gap-2">
        {myCourses.map((c) => (
          <Link
            key={c.id}
            href={c.id === selectedId ? "/instructor/students" : `/instructor/students?course=${c.id}`}
            aria-current={c.id === selectedId ? "page" : undefined}
            className={clsx(
              "rounded-btn border px-3.5 py-1.5 text-[13px] font-medium transition-colors",
              c.id === selectedId
                ? "border-brand-600 bg-brand-600 text-white"
                : "border-ink-200 bg-surface text-ink-700 hover:border-ink-300 hover:bg-ink-50",
            )}
          >
            {c.title}
          </Link>
        ))}
      </div>

      {students.length === 0 ? (
        <EmptyState
          icon={Users}
          title={`No students enrolled in ${course.title} yet`}
          description="Enrollment data will appear here as students join this course."
        />
      ) : (
        <Table>
          <THead>
            <Th>Student</Th>
            <Th>Enrolled</Th>
            <Th>Last activity</Th>
            <Th>Status</Th>
            <Th>Progress</Th>
            <Th />
          </THead>
          <TBody>
            {students.map((s) => (
              <Tr key={s.userId}>
                <Td>
                  <Link href={`/instructor/students/${s.userId}?course=${selectedId}`} className="font-medium text-ink-900 hover:text-brand-700">
                    {s.firstName} {s.lastName}
                  </Link>
                  <span className="block text-[12px] text-ink-400">@{s.username}</span>
                </Td>
                <Td>{formatDate(s.enrolledAt)}</Td>
                <Td>{s.lastActivityAt ? formatDate(s.lastActivityAt) : "—"}</Td>
                <Td>
                  <Badge variant={statusVariant[s.status] ?? "neutral"}>{s.status}</Badge>
                </Td>
                <Td className="min-w-40">
                  <ProgressLine value={s.percent} label="" />
                </Td>
                <Td>
                  <Link href={`/instructor/students/${s.userId}?course=${selectedId}`} className="text-[12.5px] font-medium text-brand-700 hover:underline">
                    View
                  </Link>
                </Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      )}
    </div>
  );
}
