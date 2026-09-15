import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { apiHandler, parseJsonBody } from "@/lib/api/handler";
import { assertNotRateLimited } from "@/lib/auth/rate-limit";
import { sessionCookieOptions } from "@/lib/auth/session";
import { register } from "@/services/auth.service";
import { registerSchema } from "@/lib/validation/schemas";

// POST /api/auth/register
export const POST = apiHandler(async (req, ctx) => {
  // 5 registration attempts per 15 minutes per IP.
  assertNotRateLimited(`register:${ctx.clientIp}`, 5, 15 * 60 * 1000);

  const input = await parseJsonBody(req, registerSchema);
  const result = await register(input, { userAgent: ctx.userAgent, ip: ctx.clientIp });

  const store = await cookies();
  const sc = sessionCookieOptions(result.token);
  store.set(sc.name, sc.value as string, sc);

  return NextResponse.json({ data: { user: { id: result.userId, role: "student" } } }, { status: 201 });
});
