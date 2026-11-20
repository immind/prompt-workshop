import { createFileRoute } from "@tanstack/react-router";
import { getEveryAppUser } from "@every-app/sdk/server";
import { env } from "cloudflare:workers";
import { getEntryImage } from "@/server/entries";

// An uploaded image, for its owner only. Private like every route: the
// Gateway admits members, and the query only finds the caller's own entries.
export const Route = createFileRoute("/images/$id")({
  server: {
    handlers: {
      GET: async ({ request, params }: { request: Request; params: { id: string } }) => {
        const user = await getEveryAppUser(request, env);
        if (!user) return new Response("Unauthorized", { status: 401 });
        const image = await getEntryImage(user.id, params.id);
        const object = image ? await env.files.get(image.key) : null;
        if (!image || !object) return new Response("Not found", { status: 404 });
        return new Response(object.body, {
          headers: {
            "content-type": image.type,
            "cache-control": "private, max-age=3600",
            "x-content-type-options": "nosniff",
          },
        });
      },
    },
  },
});
