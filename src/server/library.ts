import { and, desc, eq, or, sql } from "drizzle-orm";
import type { z } from "zod";
import { db } from "@/db";
import { libraryPrompts, librarySeeds, members } from "@/db/schema";
import type { libraryInput } from "./options";

export interface LibraryPrompt {
  id: string;
  title: string;
  category: string;
  body: string;
  author: string | null;
  canEdit: boolean;
  canDelete: boolean;
  createdAt: number;
}

interface Viewer {
  id: string;
  orgId: string;
  admin: boolean;
}

type Input = z.infer<typeof libraryInput>;

// The prompts every organization's library starts with.
const STARTERS: Input[] = [
  {
    title: "Product launch announcement",
    category: "Marketing",
    body: "You are a product marketer. Write a launch announcement for [product] aimed at [audience]. Open with the problem it solves, give three concrete benefits, and end with a single call to action. Keep it under 150 words and avoid superlatives.",
  },
  {
    title: "Tighten a draft",
    category: "Writing",
    body: "Edit the text below for clarity and brevity. Keep my meaning and tone, cut filler words, split sentences longer than 25 words, and list the three biggest changes you made after the edited version.\n\n[paste text]",
  },
  {
    title: "Explain this code",
    category: "Coding",
    body: "You are a senior engineer reviewing code with a new teammate. Explain what the code below does, step by step, then point out any bugs, edge cases or performance problems, and suggest one improvement with a short code example.\n\n[paste code]",
  },
  {
    title: "Meeting notes to action items",
    category: "Business",
    body: "Turn these meeting notes into a table with the columns Action, Owner and Due date. Add a short summary of decisions above the table and a list of open questions below it. Do not invent owners or dates: write 'unassigned' instead.\n\n[paste notes]",
  },
  {
    title: "Lesson plan",
    category: "Education",
    body: "Create a 45-minute lesson plan on [topic] for [grade or level]. Include learning goals, a warm-up, the main activity, a quick check for understanding and homework. Note the materials needed for each part.",
  },
  {
    title: "Cozy cafe interior",
    category: "Image",
    body: "A small neighbourhood cafe in the morning, wooden tables, steaming cups, plants on the windowsill, warm natural light through large windows, shallow depth of field, realistic photography, highly detailed, aspect ratio 3:2",
  },
];

/** Puts the starter prompts into an organization's library once. */
async function seed(orgId: string): Promise<void> {
  const claimed = await db
    .insert(librarySeeds)
    .values({ orgId })
    .onConflictDoNothing()
    .returning();
  if (claimed.length === 0) return;
  const now = Date.now();
  await db.insert(libraryPrompts).values(
    STARTERS.map((starter, index) => ({
      id: crypto.randomUUID(),
      orgId,
      authorId: null,
      ...starter,
      createdAt: now - STARTERS.length + index,
      updatedAt: now,
    })),
  );
}

/** The organization's library, newest first, filtered by category and text. */
export async function listLibrary(
  viewer: Viewer,
  filter: { category?: string; q?: string },
): Promise<LibraryPrompt[]> {
  await seed(viewer.orgId);
  const conditions = [eq(libraryPrompts.orgId, viewer.orgId)];
  if (filter.category) conditions.push(eq(libraryPrompts.category, filter.category));
  const q = filter.q?.trim();
  if (q) {
    const pattern = `%${q.replace(/[%_\\]/g, (c) => `\\${c}`)}%`;
    conditions.push(
      or(
        sql`${libraryPrompts.title} LIKE ${pattern} ESCAPE '\\'`,
        sql`${libraryPrompts.body} LIKE ${pattern} ESCAPE '\\'`,
      )!,
    );
  }
  const rows = await db
    .select({
      id: libraryPrompts.id,
      title: libraryPrompts.title,
      category: libraryPrompts.category,
      body: libraryPrompts.body,
      authorId: libraryPrompts.authorId,
      author: members.email,
      createdAt: libraryPrompts.createdAt,
    })
    .from(libraryPrompts)
    .leftJoin(members, eq(members.id, libraryPrompts.authorId))
    .where(and(...conditions))
    .orderBy(desc(libraryPrompts.createdAt), desc(libraryPrompts.id))
    .limit(300);
  return rows.map(({ authorId, ...row }) => ({
    ...row,
    canEdit: authorId !== null && authorId === viewer.id,
    canDelete: (authorId !== null && authorId === viewer.id) || viewer.admin,
  }));
}

/** Adds a prompt to the organization's library, authored by the viewer. */
export async function addToLibrary(viewer: Viewer, input: Input): Promise<{ id: string }> {
  const now = Date.now();
  const id = crypto.randomUUID();
  await db.insert(libraryPrompts).values({
    id,
    orgId: viewer.orgId,
    authorId: viewer.id,
    ...input,
    createdAt: now,
    updatedAt: now,
  });
  return { id };
}

/** Changes a prompt only its author wrote; false when there is none. */
export async function updateLibraryPrompt(
  viewer: Viewer,
  id: string,
  input: Input,
): Promise<boolean> {
  const changed = await db
    .update(libraryPrompts)
    .set({ ...input, updatedAt: Date.now() })
    .where(
      and(
        eq(libraryPrompts.id, id),
        eq(libraryPrompts.orgId, viewer.orgId),
        eq(libraryPrompts.authorId, viewer.id),
      ),
    )
    .returning({ id: libraryPrompts.id });
  return changed.length > 0;
}

/** Deletes a prompt the viewer wrote, or any prompt for an admin. */
export async function deleteLibraryPrompt(viewer: Viewer, id: string): Promise<boolean> {
  const scope = and(eq(libraryPrompts.id, id), eq(libraryPrompts.orgId, viewer.orgId));
  const deleted = await db
    .delete(libraryPrompts)
    .where(viewer.admin ? scope : and(scope, eq(libraryPrompts.authorId, viewer.id)))
    .returning({ id: libraryPrompts.id });
  return deleted.length > 0;
}
