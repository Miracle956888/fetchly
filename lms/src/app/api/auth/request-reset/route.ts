import { apiHandler, ok, parseJsonBody } from "@/lib/api/handler";
import { requestPasswordReset } from "@/services/auth.service";
import { requestPasswordResetSchema } from "@/lib/validation/schemas";
import { assertNotRateLimited } from "@/lib/auth/rate-limit";

// POST /api/auth/request-reset
// Always 200 with an identical body (no account enumeration). In development
// the reset link is printed to the server console.
export const POST = apiHandler(async (req, ctx) => {
  assertNotRateLimited(`reset:${ctx.clientIp}`, 5, 15 * 60 * 1000);
  const input = await parseJsonBody(req, requestPasswordResetSchema);
  await requestPasswordReset(input.email);
  return ok({ message: "If an account exists for that email, a reset link has been issued." });
});
