import { apiHandler, ok, parseJsonBody } from "@/lib/api/handler";
import { assertNotRateLimited } from "@/lib/auth/rate-limit";
import { submitContact } from "@/services/contact.service";
import { contactSchema } from "@/lib/validation/schemas";

// POST /api/contact — public contact form (3 messages/hour per IP).
export const POST = apiHandler(async (req, ctx) => {
  assertNotRateLimited(`contact:${ctx.clientIp}`, 3, 60 * 60 * 1000);
  const input = await parseJsonBody(req, contactSchema);
  const data = await submitContact(input);
  return ok({ id: data.id });
});
