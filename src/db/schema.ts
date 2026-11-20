import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

// The members this app has seen, keyed by the Gateway's user id.
export const members = sqliteTable("members", {
  id: text("id").primaryKey(),
  orgId: text("org_id").notNull(),
  email: text("email").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(current_timestamp)`),
});

// One saved result per row, private to its owner (`user_id`).
export const entries = sqliteTable(
  "entries",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    kind: text("kind", {
      enum: ["generate", "check", "image", "image_to_prompt"],
    }).notNull(),
    input: text("input").notNull(),
    // JSON: the choices the member made.
    options: text("options").notNull().default("{}"),
    // The latest prompt.
    output: text("output").notNull(),
    // JSON: extra structured result (checker report, negative prompt).
    details: text("details").notNull().default("{}"),
    // JSON: [{ output, instruction, createdAt }], oldest first.
    versions: text("versions").notNull().default("[]"),
    imageKey: text("image_key"),
    imageType: text("image_type"),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [index("entries_user_created").on(table.userId, table.createdAt)],
);

// The organization's shared prompt library.
export const libraryPrompts = sqliteTable(
  "library_prompts",
  {
    id: text("id").primaryKey(),
    orgId: text("org_id").notNull(),
    // Null for the prompts the app starts with.
    authorId: text("author_id"),
    title: text("title").notNull(),
    category: text("category").notNull(),
    body: text("body").notNull(),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [index("library_org_created").on(table.orgId, table.createdAt)],
);

// Organizations whose library already got the starter prompts.
export const librarySeeds = sqliteTable("library_seeds", {
  orgId: text("org_id").primaryKey(),
});
