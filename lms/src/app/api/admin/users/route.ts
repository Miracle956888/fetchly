import { apiHandler, okList } from "@/lib/api/handler";
import { requireApiRole } from "@/lib/auth/guards";
import { listUsers } from "@/services/user.service";
import { AppError } from "@/lib/errors";

// GET /api/admin/users?q=&role=&page=&perPage= — admin only.
export const GET = apiHandler(async (req) => {
  await requireApiRole(["admin"]);
  const sp = req.nextUrl.searchParams;
  const page = Number(sp.get("page") ?? "1");
  const perPage = Number(sp.get("perPage") ?? "20");
  const role = sp.get("role");
  if (!Number.isInteger(page) || page < 1) throw new AppError(422, "VALIDATION_ERROR", "Invalid page.");
  if (!Number.isInteger(perPage) || perPage < 1 || perPage > 100) throw new AppError(422, "VALIDATION_ERROR", "Invalid perPage.");
  if (role && !["student", "instructor", "admin"].includes(role)) {
    throw new AppError(422, "VALIDATION_ERROR", "Invalid role filter.");
  }
  const { rows, total } = await listUsers({
    q: sp.get("q") ?? undefined,
    role: role as "student" | "instructor" | "admin" | undefined,
    page,
    perPage,
  });
  return okList(
    rows.map((r) => ({ ...r.user, isActive: r.isActive })),
    { page, perPage, total, totalPages: Math.max(1, Math.ceil(total / perPage)) },
  );
});
