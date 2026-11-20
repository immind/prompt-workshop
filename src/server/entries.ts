import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { entries } from "@/db/schema";
import type { Kind } from "./options";

export type Json =
  | string
  | number
  | boolean
  | null
  | Json[]
  | { [key: string]: Json };

export interface Version {
  output: string;
  instruction: string | null;
  createdAt: number;
}

export interface Entry {
  id: string;
  kind: Kind;
  input: string;
  options: Record<string, Json>;
  output: string;
  details: Record<string, Json>;
  versions: Version[];
  hasImage: boolean;
  createdAt: number;
}

export interface EntrySummary {
  id: string;
  kind: Kind;
  input: string;
  output: string;
  hasImage: boolean;
  createdAt: number;
}

type Row = typeof entries.$inferSelect;

function toEntry(row: Row): Entry {
  return {
    id: row.id,
    kind: row.kind,
    input: row.input,
    options: JSON.parse(row.options) as Record<string, Json>,
    output: row.output,
    details: JSON.parse(row.details) as Record<string, Json>,
    versions: JSON.parse(row.versions) as Version[],
    hasImage: row.imageKey !== null,
    createdAt: row.createdAt,
  };
}

export interface NewEntry {
  kind: Kind;
  input: string;
  options?: Record<string, Json>;
  output: string;
  details?: Record<string, Json>;
  image?: { key: string; type: string };
}

/** Saves one result to the member's history. */
export async function createEntry(
  userId: string,
  entry: NewEntry,
  id: string = crypto.randomUUID(),
): Promise<Entry> {
  const now = Date.now();
  const [row] = await db
    .insert(entries)
    .values({
      id,
      userId,
      kind: entry.kind,
      input: entry.input,
      options: JSON.stringify(entry.options ?? {}),
      output: entry.output,
      details: JSON.stringify(entry.details ?? {}),
      versions: JSON.stringify([
        { output: entry.output, instruction: null, createdAt: now },
      ] satisfies Version[]),
      imageKey: entry.image?.key ?? null,
      imageType: entry.image?.type ?? null,
      createdAt: now,
    })
    .returning();
  return toEntry(row!);
}

/** The member's history, newest first, optionally of one kind. */
export async function listEntries(
  userId: string,
  kind?: Kind,
): Promise<EntrySummary[]> {
  const rows = await db
    .select({
      id: entries.id,
      kind: entries.kind,
      input: entries.input,
      output: entries.output,
      imageKey: entries.imageKey,
      createdAt: entries.createdAt,
    })
    .from(entries)
    .where(
      kind
        ? and(eq(entries.userId, userId), eq(entries.kind, kind))
        : eq(entries.userId, userId),
    )
    .orderBy(desc(entries.createdAt), desc(entries.id))
    .limit(200);
  return rows.map(({ imageKey, ...row }) => ({
    ...row,
    hasImage: imageKey !== null,
  }));
}

/** One of the member's entries, or null when they have none with this id. */
export async function getEntry(userId: string, id: string): Promise<Entry | null> {
  const [row] = await db
    .select()
    .from(entries)
    .where(and(eq(entries.id, id), eq(entries.userId, userId)));
  return row ? toEntry(row) : null;
}

/** Where the member's entry keeps its image, or null. */
export async function getEntryImage(
  userId: string,
  id: string,
): Promise<{ key: string; type: string } | null> {
  const [row] = await db
    .select({ key: entries.imageKey, type: entries.imageType })
    .from(entries)
    .where(and(eq(entries.id, id), eq(entries.userId, userId)));
  return row?.key ? { key: row.key, type: row.type ?? "application/octet-stream" } : null;
}

/** Adds a refined version to one of the member's generations, in one statement. */
export async function addVersion(
  userId: string,
  id: string,
  output: string,
  instruction: string,
): Promise<Entry | null> {
  const version: Version = { output, instruction, createdAt: Date.now() };
  const [row] = await db
    .update(entries)
    .set({
      output,
      versions: sql`json_insert(${entries.versions}, '$[#]', json(${JSON.stringify(version)}))`,
    })
    .where(
      and(
        eq(entries.id, id),
        eq(entries.userId, userId),
        eq(entries.kind, "generate"),
      ),
    )
    .returning();
  return row ? toEntry(row) : null;
}

/** Deletes one of the member's entries; returns its image key, if it had one. */
export async function deleteEntry(
  userId: string,
  id: string,
): Promise<{ deleted: boolean; imageKey: string | null }> {
  const [row] = await db
    .delete(entries)
    .where(and(eq(entries.id, id), eq(entries.userId, userId)))
    .returning({ imageKey: entries.imageKey });
  return { deleted: Boolean(row), imageKey: row?.imageKey ?? null };
}
