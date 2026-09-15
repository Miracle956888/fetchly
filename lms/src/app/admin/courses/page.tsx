import Link from "next/link";
import { listAllCourses } from "@/services/course.service";
import { clsx } from "@/lib/clsx";
import { Badge, difficultyVariant, statusVariant } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";
import { PhaseNote } from "@/components/ui/empty-state";
import { Table, TBody, Td, Th, Tr, THead } from "@/components/ui/table";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";
const PER_PAGE = 15;

export default async function AdminCoursesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  const status = (["draft", "published", "archived"].includes(String(sp.status))
    ? String(sp.status)
    : undefined) as "draft" | "published" | "archived" | undefined;

  const { rows, total } = await listAllCourses({ status, page, perPage: PER_PAGE });
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Courses</h1>
        <p className="mt-1 text-[14px] text-ink-500">{total} courses in all publication states.</p>
      </div>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter by status">
        {["all", "draft", "published", "archived"].map((s) => (
          <Link
            key={s}
            href={s === "all" ? "/admin/courses" : `/admin/courses?status=${s}`}
            aria-current={(s === "all" && !status) || status === s ? "page" : undefined}
            className={clsx(
              "rounded-btn border px-3 py-1.5 text-[13px] font-medium capitalize transition-colors",
              (s === "all" && !status) || status === s
                ? "border-brand-600 bg-brand-600 text-white"
                : "border-ink-200 bg-surface text-ink-700 hover:bg-ink-50",
            )}
          >
            {s}
          </Link>
        ))}
      </div>

      <Table>
        <THead>
          <Th>Course</Th>
          <Th>Category</Th>
          <Th>Status</Th>
          <Th>Difficulty</Th>
          <Th>Lessons</Th>
          <Th>Enrollments</Th>
          <Th>Created</Th>
        </THead>
        <TBody>
          {rows.map((c) => (
            <Tr key={c.id}>
              <Td>
                <Link href={`/courses/${c.slug}`} className="font-medium text-ink-900 hover:text-brand-700">
                  {c.title}
                </Link>
                <span className="block text-[12px] text-ink-400">/{c.slug}</span>
              </Td>
              <Td>{c.categoryName ?? "—"}</Td>
              <Td>
                <Badge variant={statusVariant[c.status] ?? "neutral"}>{c.status}</Badge>
              </Td>
              <Td>
                <Badge variant={difficultyVariant[c.difficulty]}>{c.difficulty}</Badge>
              </Td>
              <Td>{c.lessonsCount}</Td>
              <Td>{c.enrollmentsCount}</Td>
              <Td>{formatDate(c.createdAt)}</Td>
            </Tr>
          ))}
        </TBody>
      </Table>
      <Pagination page={page} totalPages={totalPages} basePath="/admin/courses" searchParams={{ status }} />
      <PhaseNote feature="creating, editing and publishing courses from the admin portal (the full course model — modules, lessons, exercises, quizzes, instructors — is already in the database)" />
    </div>
  );
}
