import { apiHandler, ok } from "@/lib/api/handler";
import { requireApiUser } from "@/lib/auth/guards";
import { getConversationHistory } from "@/services/ai/assistant.service";
import { AppError } from "@/lib/errors";

// GET /api/ai/assistant/history?conversationId= — reload a user's own
// conversation (ownership checked in the service).
export const GET = apiHandler(async (req) => {
  const user = await requireApiUser();
  const conversationId = req.nextUrl.searchParams.get("conversationId");
  if (!conversationId) throw new AppError(400, "BAD_REQUEST", "conversationId is required.");
  const rows = await getConversationHistory(user.id, conversationId);
  return ok({ messages: rows });
});
