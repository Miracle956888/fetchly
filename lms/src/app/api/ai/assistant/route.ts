import { apiHandler, ok, parseJsonBody } from "@/lib/api/handler";
import { requireApiUser } from "@/lib/auth/guards";
import { sendAssistantMessage } from "@/services/ai/assistant.service";
import { aiAssistantMessageSchema } from "@/lib/validation/schemas";

// POST /api/ai/assistant — send a message to the Learning Assistant.
// Auth + enrollment are enforced server-side; the client can never inject
// another student's context.
export const POST = apiHandler(async (req) => {
  const user = await requireApiUser();
  const input = await parseJsonBody(req, aiAssistantMessageSchema);
  const data = await sendAssistantMessage({
    userId: user.id,
    message: input.message,
    courseId: input.courseId,
    lessonId: input.lessonId,
    conversationId: input.conversationId,
  });
  return ok(data);
});
