import { apiHandler, ok } from "@/lib/api/handler";
import { requireApiUser } from "@/lib/auth/guards";
import { buildLearningContext } from "@/services/ai/context";
import { suggestedQuestionsFor } from "@/services/ai/suggestions";

// GET /api/ai/suggestions?courseId=&lessonId= — context-sensitive suggested
// questions for the current lesson (enrollment enforced in the context
// builder, same as for assistant messages).
export const GET = apiHandler(async (req) => {
  const user = await requireApiUser();
  const courseId = req.nextUrl.searchParams.get("courseId") ?? undefined;
  const lessonId = req.nextUrl.searchParams.get("lessonId") ?? undefined;
  const context = await buildLearningContext({ userId: user.id, courseId, lessonId });
  return ok({ suggestions: suggestedQuestionsFor(context) });
});
