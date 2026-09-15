import Link from "next/link";
import { listEnrollments } from "@/services/admin.service";
import { Badge, statusVariant } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";
import { Table, TBody, Td, Th, Tr, THead } from "@/components/ui/table";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";
const PER_PAGE = 15;

export default async function AdminEnrollmentsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  const { rows, total } = await listEnrollments({ page, perPage: PER_PAGE });
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Enrollments</h1>
        <p className="mt-1 text-[14px] text-ink-500">{total} enrollment records, most recent first.</p>
      </div>

      <Table>
        <THead>
          <Th>Student</Th>
          <Th>Course</Th>
          <Th>Status</Th>
          <Th>Enrolled</Th>
          <Th>Last activity</Th>
        </THead>
        <TBody>
          {rows.map((r) => (
            <Tr key={r.id}>
              <Td>
                <span className="font-medium text-ink-900">{r.studentName}</span>
                <span className="block text-[12px] text-ink-400">@{r.studentUsername}</span>
              </Td>
              <Td>
                <Link href={`/courses/${r.courseSlug}`} className="text-ink-700 hover:text-brand-700">
                  {r.courseTitle}
                </Link>
              </Td>
              <Td>
                <Badge variant={statusVariant[r.status] ?? "neutral"}>{r.status}</Badge>
              </Td>
              <Td>{formatDate(r.enrolledAt)}</Td>
              <Td>{r.lastActivityAt ? formatDate(r.lastActivityAt) : "—"}</Td>
            </Tr>
          ))}
        </TBody>
      </Table>
      <Pagination page={page} totalPages={totalPages} basePath="/admin/enrollments" />
    </div>
  );
}
