import { createServerFn } from "@tanstack/react-start";
import { env } from "cloudflare:workers";
import { z } from "zod";
import { ensureUserMiddleware } from "@every-app/sdk/tanstack-start";
import * as entries from "@/server/entries";
import { KINDS } from "@/server/options";
import { viewerOf } from "./context";

export const getHistory = createServerFn()
  .middleware([ensureUserMiddleware])
  .validator((data: unknown) => z.object({ kind: z.enum(KINDS).optional() }).parse(data ?? {}))
  .handler(async ({ data, context }) => {
    const viewer = await viewerOf(context.user);
    return entries.listEntries(viewer.id, data.kind);
  });

export const getHistoryEntry = createServerFn()
  .middleware([ensureUserMiddleware])
  .validator((data: unknown) => z.object({ id: z.string().max(100) }).parse(data))
  .handler(async ({ data, context }) => {
    const viewer = await viewerOf(context.user);
    return entries.getEntry(viewer.id, data.id);
  });

export const deleteHistoryEntry = createServerFn({ method: "POST" })
  .middleware([ensureUserMiddleware])
  .validator((data: unknown) => z.object({ id: z.string().uuid() }).strict().parse(data))
  .handler(async ({ data, context }) => {
    const viewer = await viewerOf(context.user);
    const { deleted, imageKey } = await entries.deleteEntry(viewer.id, data.id);
    if (imageKey) await env.files.delete(imageKey);
    return { deleted };
  });
