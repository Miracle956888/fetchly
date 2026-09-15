import { apiHandler, okList } from "@/lib/api/handler";
import { listPublishedCourses } from "@/services/course.service";
import { courseListQuerySchema } from "@/lib/validation/schemas";
import { AppError } from "@/lib/errors";

// GET /api/courses?category=&difficulty=&q=&sort=&page=&perPage=
// Public, paginated course catalog.
export const GET = apiHandler(async (req) => {
  const raw = Object.fromEntries(req.nextUrl.searchParams.entries());
  const parsed = courseListQuerySchema.safeParse(raw);
  if (!parsed.success) {
    throw new AppError(422, "VALIDATION_ERROR", "Invalid query parameters.", parsed.error.issues.map((i) => ({ field: i.path.join("."), message: i.message })));
  }
  const { rows, total } = await listPublishedCourses(parsed.data);
  const page = parsed.data.page;
  const perPage = parsed.data.perPage;
  return okList(rows, {
    page,
    perPage,
    total,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
  });
});
