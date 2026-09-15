import { requireRole } from "@/lib/auth/guards";
import { listInstructorCourses, listInstructorStudents } from "@/services/course.service";
import { StatCard } from "@/components/layout/stat-card";
import { PhaseNote } from "@/components/ui/empty-state";
import { Table, TBody, Td, Th, Tr, THead } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { BookOpen } from "lucide-react";

export default async function InstructorAnalyticsPage() {
  const ctx = await requireRole(["instructor"], "/instructor");
  const courses = await listInstructorCourses(ctx.user.id);

  // Real per-course aggregates: student count + average progress across the
  // instructor's scoped student rows.
  const courseStats = [];
  for (const c of courses) {
    const students = await listInstructorStudents(ctx.user.id, c.id);
    const avg = students.length > 0 ? Math.round(students.reduce((s, x) => s + x.percent, 0) / students.length) : 0;
    courseStats.push({ course: c, studentCount: students.length, avgPercent: avg });
  }

  const totalStudents = courseStats.reduce((s, r) => s + r.studentCount, 0);
  const overallAvg = totalStudents > 0 ? Math.round(courseStats.reduce((s, r) => s + r.avgPercent * r.studentCount, 0) / totalStudents) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Analytics</h1>
        <p className="mt-1 text-[14px] text-ink-500">Performance overview for the courses you teach.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Courses" value={courses.length} icon={<BookOpen className="h-4 w-4" />} />
        <StatCard label="Enrolled students" value={totalStudents} />
        <StatCard label="Average progress" value={`${overallAvg}%`} hint="Across your students" />
      </div>

      {courseStats.length === 0 ? (
        <EmptyState icon={BookOpen} title="No courses assigned yet" description="Analytics appear once you're assigned to courses." />
      ) : (
        <Table>
          <THead>
            <Th>Course</Th>
            <Th>Students</Th>
            <Th>Average progress</Th>
          </THead>
          <TBody>
            {courseStats.map((r) => (
              <Tr key={r.course.id}>
                <Td>
                  <span className="font-medium text-ink-900">{r.course.title}</span>
                </Td>
                <Td>{r.studentCount}</Td>
                <Td>
                  <div className="flex items-center gap-3">
                    <div className="h-1.5 w-28 overflow-hidden rounded-full bg-ink-100">
                      <div className="h-full rounded-full bg-brand-600" style={{ width: `${r.avgPercent}%` }} />
                    </div>
                    <span className="text-[12.5px] tabular-nums text-ink-500">{r.avgPercent}%</span>
                  </div>
                </Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      )}

      <PhaseNote feature="per-student trend charts, completion funnels and cohort comparisons (the underlying progress, quiz and activity data is already recorded)" />
    </div>
  );
}
