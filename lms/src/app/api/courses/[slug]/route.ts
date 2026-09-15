import { apiHandler, ok } from "@/lib/api/handler";
import { getPublishedCourseBySlug } from "@/services/course.service";
import { NotFoundError } from "@/lib/errors";
import { courseSlugSchema } from "@/lib/validation/schemas";

// GET /api/courses/:slug — public course detail with curriculum outline.
export const GET = apiHandler(async (_req, _ctx, params) => {
  const slug = courseSlugSchema.safeParse((await params).slug);
  if (!slug.success) throw new NotFoundError("Course not found.");
  const detail = await getPublishedCourseBySlug(slug.data);
  if (!detail) throw new NotFoundError("Course not found.");
  return ok(detail);
});
