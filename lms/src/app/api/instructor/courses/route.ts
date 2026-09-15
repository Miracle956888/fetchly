import { apiHandler, ok } from "@/lib/api/handler";
import { requireApiRole } from "@/lib/auth/guards";
import { listInstructorCourses } from "@/services/course.service";

// GET /api/instructor/courses — the current instructor's assigned courses.
export const GET = apiHandler(async () => {
  const user = await requireApiRole(["instructor", "admin"]);
  const data = await listInstructorCourses(user.id);
  return ok(data);
});
