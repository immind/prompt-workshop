import { fileURLToPath } from "node:url";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { beforeAll, describe, expect, it, vi } from "vitest";
import * as schema from "@/db/schema";

// An in-memory SQLite with the app's migrations stands in for D1.
const testDb = vi.hoisted(() => ({ current: null as unknown }));
vi.mock("@/db", () => ({
  get db() {
    return testDb.current;
  },
}));

const entries = await import("./entries");
const library = await import("./library");

beforeAll(async () => {
  const db = drizzle(createClient({ url: ":memory:" }), { schema });
  await migrate(db, {
    migrationsFolder: fileURLToPath(new URL("../../drizzle", import.meta.url)),
  });
  testDb.current = db;
});

describe("history", () => {
  it("is private to its owner", async () => {
    const mine = await entries.createEntry("alice", { kind: "generate", input: "idea", output: "v1" });
    await entries.createEntry("bob", { kind: "check", input: "p", output: "better" });

    expect((await entries.listEntries("alice")).map((e) => e.id)).toEqual([mine.id]);
    expect(await entries.getEntry("bob", mine.id)).toBeNull();
    expect(await entries.addVersion("bob", mine.id, "hijack", "x")).toBeNull();
    expect((await entries.deleteEntry("bob", mine.id)).deleted).toBe(false);

    const refined = await entries.addVersion("alice", mine.id, "v2", "shorter");
    expect(refined?.versions.map((v) => v.output)).toEqual(["v1", "v2"]);
    expect(refined?.output).toBe("v2");
    expect(await entries.listEntries("alice", "check")).toEqual([]);
    expect((await entries.deleteEntry("alice", mine.id)).deleted).toBe(true);
  });
});

describe("library", () => {
  const alice = { id: "alice", orgId: "org", admin: false };
  const bob = { id: "bob", orgId: "org", admin: false };
  const boss = { id: "boss", orgId: "org", admin: true };
  const stranger = { id: "eve", orgId: "other", admin: true };

  it("starts with prompts, once per organization", async () => {
    const first = await library.listLibrary(alice, {});
    expect(first.length).toBeGreaterThanOrEqual(4);
    expect(await library.listLibrary(bob, {})).toHaveLength(first.length);
  });

  it("lets only the author edit and the author or an admin delete", async () => {
    const input = { title: "Mine", category: "Writing" as const, body: "Write well" };
    const { id } = await library.addToLibrary(alice, input);
    expect(await library.updateLibraryPrompt(bob, id, { ...input, title: "Bob" })).toBe(false);
    expect(await library.updateLibraryPrompt(boss, id, { ...input, title: "Boss" })).toBe(false);
    expect(await library.deleteLibraryPrompt(bob, id)).toBe(false);
    expect(await library.deleteLibraryPrompt(stranger, id)).toBe(false);
    expect((await library.listLibrary(stranger, { q: "Write well" })).length).toBe(0);
    expect(await library.updateLibraryPrompt(alice, id, { ...input, title: "Mine 2" })).toBe(true);
    const [found] = await library.listLibrary(bob, { q: "Write well" });
    expect(found).toMatchObject({ title: "Mine 2", canEdit: false, canDelete: false });
    expect(await library.deleteLibraryPrompt(boss, id)).toBe(true);
  });

  it("filters by category and text", async () => {
    await library.addToLibrary(alice, { title: "50% off", category: "Marketing", body: "Sale" });
    expect((await library.listLibrary(alice, { q: "50%" })).map((p) => p.title)).toEqual(["50% off"]);
    const coding = await library.listLibrary(alice, { category: "Coding" });
    expect(coding.every((p) => p.category === "Coding")).toBe(true);
  });
});
