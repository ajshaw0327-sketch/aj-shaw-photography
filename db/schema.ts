import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const photos = sqliteTable("photos", {
  id: text("id").primaryKey(),
  storageKey: text("storage_key"),
  src: text("src").notNull(),
  category: text("category").notNull(),
  title: text("title").notNull(),
  detail: text("detail").notNull().default(""),
  alt: text("alt").notNull(),
  featured: integer("featured", { mode: "boolean" }).notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
