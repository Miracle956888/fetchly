import { integer, pgTable, text, timestamp, index, uuid } from "drizzle-orm/pg-core";

// Categories are a first-class, admin-managed entity — never hard-coded in the UI.
export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("categories_sort_order_idx").on(t.sortOrder)],
);
