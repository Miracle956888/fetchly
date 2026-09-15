import Link from "next/link";
import { listUsers } from "@/services/user.service";
import { clsx } from "@/lib/clsx";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Pagination } from "@/components/ui/pagination";
import { Table, TBody, Td, Th, Tr, THead } from "@/components/ui/table";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

const PER_PAGE = 15;

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  const role = (["student", "instructor", "admin"].includes(String(sp.role))
    ? String(sp.role)
    : undefined) as "student" | "instructor" | "admin" | undefined;
  const q = typeof sp.q === "string" && sp.q.trim() ? sp.q.trim() : undefined;

  const { rows, total } = await listUsers({ q, role, page, perPage: PER_PAGE });
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold">Users</h1>
          <p className="mt-1 text-[14px] text-ink-500">{total} accounts across all roles.</p>
        </div>
        <UserFilters q={q ?? ""} role={role} />
      </div>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter by role">
        {["all", "student", "instructor", "admin"].map((r) => (
          <Link
            key={r}
            href={r === "all" ? "/admin/users" : `/admin/users?role=${r}`}
            aria-current={r === "all" ? !role : role === r ? "page" : undefined}
            className={clsx(
              "rounded-btn border px-3 py-1.5 text-[13px] font-medium capitalize transition-colors",
              (r === "all" && !role) || role === r
                ? "border-brand-600 bg-brand-600 text-white"
                : "border-ink-200 bg-surface text-ink-700 hover:bg-ink-50",
            )}
          >
            {r === "all" ? "All roles" : r}
          </Link>
        ))}
      </div>

      <Table>
        <THead>
          <Th>User</Th>
          <Th>Username</Th>
          <Th>Role</Th>
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
              <Td>
                <Badge variant={r.user.role === "admin" ? "danger" : r.user.role === "instructor" ? "brand" : "neutral"}>
                  {r.user.role}
                </Badge>
              </Td>
              <Td>
                <Badge variant={r.isActive ? "success" : "neutral"}>{r.isActive ? "active" : "disabled"}</Badge>
              </Td>
              <Td>{formatDate(r.user.createdAt)}</Td>
            </Tr>
          ))}
        </TBody>
      </Table>
      <Pagination page={page} totalPages={totalPages} basePath="/admin/users" searchParams={{ role, q }} />
    </div>
  );
}

function UserFilters({ q, role }: { q: string; role?: string }) {
  return (
    <form action="/admin/users" method="get" className="flex items-center gap-2">
      {role && <input type="hidden" name="role" value={role} />}
      <label htmlFor="admin-user-search" className="sr-only">
        Search users
      </label>
      <input
        id="admin-user-search"
        name="q"
        defaultValue={q}
        placeholder="Search name, email, username…"
        className="h-9.5 w-64 rounded-btn border border-ink-200 bg-surface px-3 text-sm placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
      />
      <button
        type="submit"
        className="h-9.5 rounded-btn bg-ink-900 px-4 text-sm font-medium text-white transition-colors hover:bg-ink-800"
      >
        Search
      </button>
    </form>
  );
}
