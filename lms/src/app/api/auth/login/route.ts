import { cookies } from "next/headers";
import { apiHandler, ok, parseJsonBody } from "@/lib/api/handler";
import { assertNotRateLimited } from "@/lib/auth/rate-limit";
import { sessionCookieOptions } from "@/lib/auth/session";
import { login } from "@/services/auth.service";
import { loginSchema } from "@/lib/validation/schemas";
import { roleHome, safeNextPath } from "@/lib/utils";

// POST /api/auth/login
export const POST = apiHandler(async (req, ctx) => {
  // 10 login attempts per 15 minutes per IP (brute-force baseline; pair with
  // account lockout / Redis limiter in production).
  assertNotRateLimited(`login:${ctx.clientIp}`, 10, 15 * 60 * 1000);

  const input = await parseJsonBody(req, loginSchema);
  const result = await login(input, { userAgent: ctx.userAgent, ip: ctx.clientIp });

  const store = await cookies();
  const sc = sessionCookieOptions(result.token);
  store.set(sc.name, sc.value as string, sc);

  // `next` is sanitized (same-origin absolute paths only).
  const next = safeNextPath(input.next);
  return ok({ next: next ?? roleHome(result.role) }, { meta: { role: result.role } });
});
