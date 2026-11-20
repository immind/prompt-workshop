// The app's tools for AI clients. The Gateway serves them at /mcp and calls
// each with the signed-in user; the app never speaks MCP itself.
import { defineTools, isAdmin } from "@every-app/sdk/server";
import { z } from "zod";
import * as entries from "@/server/entries";
import * as library from "@/server/library";
import { rememberMember } from "@/server/members";
import { CATEGORIES, KINDS } from "@/server/options";

export const tools = defineTools({
  search_library: {
    description:
      "Search the team's shared prompt library by text and category.",
    risk: "read",
    input: z
      .object({
        q: z.string().max(200).optional(),
        category: z.enum(CATEGORIES).optional(),
      })
      .strict(),
    handler: async (input, { user }) => {
      await rememberMember(user);
      const found = await library.listLibrary(
        { id: user.id, orgId: user.orgId, admin: isAdmin(user) },
        input,
      );
      return found.map(({ id, title, category, body }) => ({ id, title, category, body }));
    },
  },
  list_history: {
    description:
      "List the user's own saved prompts, checks and image prompts, newest first.",
    risk: "read",
    input: z.object({ kind: z.enum(KINDS).optional() }).strict(),
    handler: (input, { user }) => entries.listEntries(user.id, input.kind),
  },
});
