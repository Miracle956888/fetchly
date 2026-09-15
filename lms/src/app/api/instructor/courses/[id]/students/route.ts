import { apiHandler, ok } from "@/lib/api/handler";
import { requireApiRole } from "@/lib/auth/guards";
import { assertInstructorAssigned, listInstructorStudents } from "@/services/course.service";
import { NotFoundError } from "@/lib/errors";

// GET /api/instructor/courses/:id/students
// Instructor-scoped: 404 if the course id is invalid, 403 if the instructor
// is not assigned to it, otherwise only students of that course.
export const GET = apiHandler(async (_req, _ctx, params) => {
  const user = await requireApiRole(["instructor", "admin"]);
  const courseId = String((await params).id);
  if (!/^[a-f0-9-]{36}$/.test(courseId)) throw new NotFoundError("Course not found.");
  await assertInstructorAssigned(user.id, courseId);
  const data = await listInstructorStudents(user.id, courseId);
  return ok(data);
});
