import { listUsers } from "@/services/user.service";
import { Pagination } from "@/components/ui/pagination";
import { Table, TBody, Td, Th, Tr, THead } from "@/components/ui/table";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";
const PER_PAGE = 15;

export default async function AdminStudentsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  const { rows, total } = await listUsers({ role: "student", page, perPage: PER_PAGE });
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Students</h1>
        <p className="mt-1 text-[14px] text-ink-500">{total} student accounts. Per-student management (suspension, data export) arrives in Phase 02.</p>
      </div>
      <Table>
        <THead>
          <Th>Student</Th>
          <Th>Username</Th>
          <Th>Country</Th>
          <Th>Status</Th>
          <Th>Joined</Th>
        </THead>
        <TBody>
          {rows.map((r) => (
            <Tr key={r.user.id}>
              <Td>
                <span className="flex items-center gap-2.5">
                  <Avatar firstName={r.user.firstName} lastName={r.user.lastName} size="sm" />
                  <span>
                    <span className="block font-medium text-ink-900">
                      {r.user.firstName} {r.user.lastName}
                    </span>
                    <span className="block text-[12px] text-ink-400">{r.user.email}</span>
                  </span>
                </span>
              </Td>
              <Td>@{r.user.username}</Td>
              <Td>{r.user.country ?? "—"}</Td>
              <Td>
                <Badge variant={r.isActive ? "success" : "neutral"}>{r.isActive ? "active" : "disabled"}</Badge>
              </Td>
              <Td>{formatDate(r.user.createdAt)}</Td>
            </Tr>
          ))}
        </TBody>
      </Table>
      <Pagination page={page} totalPages={totalPages} basePath="/admin/students" />
    </div>
  );
}
