import { apiHandler, ok } from "@/lib/api/handler";
import { listCategoriesWithCounts } from "@/services/category.service";

// GET /api/categories — public category list with published course counts.
export const GET = apiHandler(async () => {
  const data = await listCategoriesWithCounts();
  return ok(data);
});
