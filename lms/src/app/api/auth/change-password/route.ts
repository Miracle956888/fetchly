import { cookies } from "next/headers";
import { apiHandler, ok, parseJsonBody } from "@/lib/api/handler";
import { changePassword } from "@/services/auth.service";
import { changePasswordSchema } from "@/lib/validation/schemas";
import { requireApiUser } from "@/lib/auth/guards";
import { clearSessionCookieOptions } from "@/lib/auth/session";

// POST /api/auth/change-password
// Succeeds → all sessions revoked (including this one); the client must
// log in again with the new password.
export const POST = apiHandler(async (req) => {
  const user = await requireApiUser();
  const input = await parseJsonBody(req, changePasswordSchema);
  await changePassword(user.id, input.currentPassword, input.newPassword);

  const store = await cookies();
  const sc = clearSessionCookieOptions();
  store.set(sc.name, sc.value as string, sc);
  return ok({ relogin: true });
});
