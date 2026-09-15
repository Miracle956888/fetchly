import { apiHandler, okList } from "@/lib/api/handler";
import { requireApiRole } from "@/lib/auth/guards";
import { listAllCourses } from "@/services/course.service";
import { AppError } from "@/lib/errors";

// GET /api/admin/courses?status=&q=&page=&perPage= — admin only (all statuses).
export const GET = apiHandler(async (req) => {
  await requireApiRole(["admin"]);
  const sp = req.nextUrl.searchParams;
  const page = Number(sp.get("page") ?? "1");
  const perPage = Number(sp.get("perPage") ?? "20");
  const status = sp.get("status");
  if (!Number.isInteger(page) || page < 1) throw new AppError(422, "VALIDATION_ERROR", "Invalid page.");
  if (status && !["draft", "published", "archived"].includes(status)) {
    throw new AppError(422, "VALIDATION_ERROR", "Invalid status filter.");
  }
  const { rows, total } = await listAllCourses({
    status: status as "draft" | "published" | "archived" | undefined,
    q: sp.get("q") ?? undefined,
    page,
    perPage,
  });
  return okList(rows, { page, perPage, total, totalPages: Math.max(1, Math.ceil(total / perPage)) });
});
