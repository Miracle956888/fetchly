import { integer, pgTable, text, timestamp, index, uuid } from "drizzle-orm/pg-core";

// Top-level category sections for public navigation (admin can add categories
// to any section later; "other" is the catch-all).
export const CATEGORY_SECTIONS = ["front_end", "back_end", "databases", "languages", "full_stack", "other"] as const;
export type CategorySection = (typeof CATEGORY_SECTIONS)[number];

// Categories are a first-class, admin-managed entity — never hard-coded in the UI.
export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description"),
    /** Which public navigation group this category belongs to. */
    section: text("section").$type<CategorySection>().notNull().default("other"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("categories_sort_order_idx").on(t.sortOrder)],
);
