import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { ensureUserMiddleware } from "@every-app/sdk/tanstack-start";
import * as library from "@/server/library";
import { CATEGORIES, libraryInput } from "@/server/options";
import { anObject, viewerOf } from "./context";

export const getLibrary = createServerFn()
  .middleware([ensureUserMiddleware])
  .validator((data: unknown) =>
    z
      .object({ category: z.enum(CATEGORIES).optional(), q: z.string().max(200).optional() })
      .parse(data ?? {}),
  )
  .handler(async ({ data, context }) => library.listLibrary(await viewerOf(context.user), data));

function invalid(error: z.ZodError) {
  const issue = error.issues[0]!;
  return { ok: false, error: issue.message, field: String(issue.path[0] ?? "") } as const;
}

export const addLibraryPrompt = createServerFn({ method: "POST" })
  .middleware([ensureUserMiddleware])
  .validator(anObject)
  .handler(async ({ data, context }) => {
    const parsed = libraryInput.safeParse(data);
    if (!parsed.success) return invalid(parsed.error);
    const { id } = await library.addToLibrary(await viewerOf(context.user), parsed.data);
    return { ok: true, id } as const;
  });

export const editLibraryPrompt = createServerFn({ method: "POST" })
  .middleware([ensureUserMiddleware])
  .validator(anObject)
  .handler(async ({ data, context }) => {
    const { id, ...rest } = data;
    const parsed = libraryInput.safeParse(rest);
    if (!parsed.success) return invalid(parsed.error);
    if (typeof id !== "string") return { ok: false, error: "Missing prompt." } as const;
    const changed = await library.updateLibraryPrompt(await viewerOf(context.user), id, parsed.data);
    return changed
      ? ({ ok: true, id } as const)
      : ({ ok: false, error: "Only the person who added this prompt can edit it." } as const);
  });

export const removeLibraryPrompt = createServerFn({ method: "POST" })
  .middleware([ensureUserMiddleware])
  .validator((data: unknown) => z.object({ id: z.string().uuid() }).strict().parse(data))
  .handler(async ({ data, context }) => {
    const deleted = await library.deleteLibraryPrompt(await viewerOf(context.user), data.id);
    return { deleted };
  });
