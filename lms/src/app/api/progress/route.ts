import { apiHandler, ok, parseJsonBody } from "@/lib/api/handler";
import { requireApiUser } from "@/lib/auth/guards";
import { markLessonCompleted, listMyProgress } from "@/services/progress.service";
import { progressUpdateSchema } from "@/lib/validation/schemas";
import { computeCourseProgress } from "@/services/course.service";

// GET /api/progress?courseId= — the user's progress for one course (or all).
export const GET = apiHandler(async (req) => {
  const user = await requireApiUser();
  const courseId = req.nextUrl.searchParams.get("courseId");
  if (!courseId) return ok(await listMyProgress(user));
  return ok(await computeCourseProgress(user.id, courseId));
});

// POST /api/progress — mark a lesson completed (own progress only).
export const POST = apiHandler(async (req) => {
  const user = await requireApiUser();
  const input = await parseJsonBody(req, progressUpdateSchema);
  const data = await markLessonCompleted(user, input.lessonId);
  return ok(data);
});
