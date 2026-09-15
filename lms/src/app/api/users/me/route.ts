import { apiHandler, ok, parseJsonBody } from "@/lib/api/handler";
import { requireApiUser } from "@/lib/auth/guards";
import { updateProfile } from "@/services/user.service";
import { profileUpdateSchema } from "@/lib/validation/schemas";

// PATCH /api/users/me — self-service profile update (own account only).
export const PATCH = apiHandler(async (req) => {
  const user = await requireApiUser();
  const input = await parseJsonBody(req, profileUpdateSchema);
  const data = await updateProfile(user.id, input);
  return ok(data);
});
