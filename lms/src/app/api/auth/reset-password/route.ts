import { apiHandler, ok, parseJsonBody } from "@/lib/api/handler";
import { resetPassword } from "@/services/auth.service";
import { resetPasswordSchema } from "@/lib/validation/schemas";

// POST /api/auth/reset-password
export const POST = apiHandler(async (req) => {
  const input = await parseJsonBody(req, resetPasswordSchema);
  await resetPassword(input.token, input.password);
  return ok({ message: "Password updated. You can now log in." });
});
