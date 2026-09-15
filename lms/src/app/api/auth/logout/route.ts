import { cookies } from "next/headers";
import { apiHandler, ok } from "@/lib/api/handler";
import { clearSessionCookieOptions, SESSION_COOKIE } from "@/lib/auth/session";
import { logout } from "@/services/auth.service";

// POST /api/auth/logout
export const POST = apiHandler(async () => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await logout(token);
  const sc = clearSessionCookieOptions();
  store.set(sc.name, sc.value as string, sc);
  return ok({ next: "/" });
});
