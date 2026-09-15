import Link from "next/link";
import { BookOpen } from "lucide-react";
import { requireRole } from "@/lib/auth/guards";
import { listInstructorCourses } from "@/services/course.service";
import { Badge, difficultyVariant, statusVariant } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TBody, Td, Th, Tr, THead } from "@/components/ui/table";

export default async function InstructorCoursesPage() {
  const ctx = await requireRole(["instructor"], "/instructor");
  const courses = await listInstructorCourses(ctx.user.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">My courses</h1>
        <p className="mt-1 text-[14px] text-ink-500">
          Courses assigned to you. Curriculum editing ships in Phase 02.
        </p>
      </div>

      {courses.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No courses assigned yet"
          description="Course assignments are managed by the platform administrators."
        />
      ) : (
        <Table>
          <THead>
            <Th>Course</Th>
            <Th>Status</Th>
            <Th>Difficulty</Th>
            <Th>Students</Th>
            <Th>Lessons</Th>
            <Th>Role</Th>
          </THead>
          <TBody>
            {courses.map((c) => (
              <Tr key={c.id}>
                <Td>
                  <Link href={`/instructor/courses/${c.id}`} className="font-medium text-ink-900 hover:text-brand-700">
                    {c.title}
                  </Link>
                </Td>
                <Td>
                  <Badge variant={statusVariant[c.status] ?? "neutral"}>{c.status}</Badge>
                </Td>
                <Td>
                  <Badge variant={difficultyVariant[c.difficulty]}>{c.difficulty}</Badge>
                </Td>
                <Td>{c.studentsCount}</Td>
                <Td>{c.lessonsCount}</Td>
                <Td className="capitalize">{c.assignmentRole}</Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      )}
    </div>
  );
}
