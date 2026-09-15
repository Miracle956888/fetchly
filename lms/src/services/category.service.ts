/**
 * Category service. Categories are admin-managed data — the UI only reads
 * what this service returns, never a hard-coded list.
 */
import { asc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { categories, courses, type CategorySection } from "@/db/schema";
import { NotFoundError } from "@/lib/errors";

export interface CategoryWithCount {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  section: CategorySection;
  sortOrder: number;
  courseCount: number;
}

const SELECT_WITH_COUNT = {
  id: categories.id,
  name: categories.name,
  slug: categories.slug,
  description: categories.description,
  section: categories.section,
  sortOrder: categories.sortOrder,
  courseCount: sql<number>`count(${courses.id}) filter (where ${courses.status} = 'published')::int`,
};

export async function listCategoriesWithCounts(): Promise<CategoryWithCount[]> {
  const db = await getDb();
  return db
    .select(SELECT_WITH_COUNT)
    .from(categories)
    .leftJoin(courses, eq(courses.categoryId, categories.id))
    .groupBy(categories.id)
    .orderBy(asc(categories.sortOrder), asc(categories.name));
}

export interface CategorySectionGroup {
  section: CategorySection;
  /** Public label for the section (derived, not stored). */
  label: string;
  categories: CategoryWithCount[];
}

export const SECTION_LABELS: Record<CategorySection, string> = {
  front_end: "Front-End Development",
  back_end: "Back-End Development",
  databases: "Databases",
  languages: "Programming Languages",
  full_stack: "Full-Stack Development",
  other: "More Topics",
};

const SECTION_ORDER: CategorySection[] = ["front_end", "back_end", "databases", "languages", "full_stack", "other"];

/** Categories grouped by public navigation section (stable section order). */
export async function listCategorySections(): Promise<CategorySectionGroup[]> {
  const all = await listCategoriesWithCounts();
  const groups: CategorySectionGroup[] = [];
  for (const section of SECTION_ORDER) {
    const cats = all.filter((c) => c.section === section);
    if (cats.length === 0) continue;
    groups.push({ section, label: SECTION_LABELS[section], categories: cats });
  }
  return groups;
}

export async function getCategoryBySlug(slug: string): Promise<CategoryWithCount | null> {
  const db = await getDb();
  const rows = await db
    .select(SELECT_WITH_COUNT)
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
