import { apiHandler, ok } from "@/lib/api/handler";
import { requireApiUser } from "@/lib/auth/guards";

// GET /api/auth/me — current user (401 when unauthenticated).
export const GET = apiHandler(async () => {
  const user = await requireApiUser();
  return ok(user);
});
