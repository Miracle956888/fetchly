import { NextResponse } from "next/server";
import { apiHandler, ok, parseJsonBody } from "@/lib/api/handler";
import { requireApiUser } from "@/lib/auth/guards";
import { enroll, listMyEnrollments } from "@/services/enrollment.service";
import { enrollmentCreateSchema } from "@/lib/validation/schemas";

// GET /api/enrollments — current user's enrollments.
export const GET = apiHandler(async () => {
  const user = await requireApiUser();
  const data = await listMyEnrollments(user);
  return ok(data);
});

// POST /api/enrollments — enroll the current user in a course (idempotent).
export const POST = apiHandler(async (req) => {
  const user = await requireApiUser();
  const input = await parseJsonBody(req, enrollmentCreateSchema);
  const data = await enroll(user, input.courseId);
  return NextResponse.json({ data }, { status: 201 });
});
