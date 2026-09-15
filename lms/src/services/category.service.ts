/**
 * Category service. Categories are admin-managed data — the UI only reads
 * what this service returns, never a hard-coded list.
 */
import { asc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { categories, courses } from "@/db/schema";
import { NotFoundError } from "@/lib/errors";

export interface CategoryWithCount {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sortOrder: number;
  courseCount: number;
}

export async function listCategoriesWithCounts(): Promise<CategoryWithCount[]> {
  const db = await getDb();
  const rows = await db
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      description: categories.description,
      sortOrder: categories.sortOrder,
      courseCount: sql<number>`count(${courses.id}) filter (where ${courses.status} = 'published')::int`,
    })
    .from(categories)
    .leftJoin(courses, eq(courses.categoryId, categories.id))
    .groupBy(categories.id)
    .orderBy(asc(categories.sortOrder), asc(categories.name));
  return rows;
}

export async function getCategoryBySlug(slug: string): Promise<CategoryWithCount | null> {
  const db = await getDb();
  const rows = await db
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      description: categories.description,
      sortOrder: categories.sortOrder,
      courseCount: sql<number>`count(${courses.id}) filter (where ${courses.status} = 'published')::int`,
    })
    .from(categories)
    .leftJoin(courses, eq(courses.categoryId, categories.id))
    .where(eq(categories.slug, slug))
    .groupBy(categories.id)
    .limit(1);
  return rows[0] ?? null;
}

export async function getCategoryOrThrow(id: string): Promise<{ id: string; name: string }> {
  const db = await getDb();
  const [row] = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
  if (!row) throw new NotFoundError("Category not found.");
  return { id: row.id, name: row.name };
}
