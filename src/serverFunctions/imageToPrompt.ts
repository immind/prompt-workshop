import { createServerFn } from "@tanstack/react-start";
import { env } from "cloudflare:workers";
import { ensureUserMiddleware } from "@every-app/sdk/tanstack-start";
import { AiError, chat } from "@/server/ai";
import * as entries from "@/server/entries";
import { imageKeyFor } from "@/server/images";
import { IMAGE_TYPES, MAX_IMAGE_BYTES } from "@/server/options";
import { describeMessages } from "@/server/prompts";
import { viewerOf } from "./context";

export const describeImage = createServerFn({ method: "POST" })
  .middleware([ensureUserMiddleware])
  .validator((data: unknown) => {
    if (!(data instanceof FormData)) throw new Error("Expected a form.");
    return data;
  })
  .handler(async ({ data, context }) => {
    const file = data.get("image");
    if (!(file instanceof File)) {
      return { ok: false, error: "Choose an image." } as const;
    }
    if (!(IMAGE_TYPES as readonly string[]).includes(file.type)) {
      return { ok: false, error: "Use a JPG, PNG or WebP image." } as const;
    }
    if (file.size === 0 || file.size > MAX_IMAGE_BYTES) {
      return { ok: false, error: "Use an image of up to 5 MB." } as const;
    }
    const viewer = await viewerOf(context.user);
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!looksLike(file.type, bytes)) {
      return { ok: false, error: "Use a JPG, PNG or WebP image." } as const;
    }
    let output: string;
    try {
      output = await chat(describeMessages(`data:${file.type};base64,${base64(bytes)}`));
    } catch (error) {
      if (error instanceof AiError) return { ok: false, error: error.message } as const;
      throw error;
    }
    const id = crypto.randomUUID();
    const key = imageKeyFor(viewer.id, id);
    await env.files.put(key, bytes, { httpMetadata: { contentType: file.type } });
    try {
      const entry = await entries.createEntry(
        viewer.id,
        {
          kind: "image_to_prompt",
          input: file.name.slice(0, 200) || "image",
          options: { type: file.type, size: file.size },
          output,
          image: { key, type: file.type },
        },
        id,
      );
      return { ok: true, entry } as const;
    } catch (error) {
      await env.files.delete(key);
      throw error;
    }
  });

/** Whether the bytes start the way the claimed image type does. */
function looksLike(type: string, bytes: Uint8Array): boolean {
  const ascii = (from: number, to: number) => String.fromCharCode(...bytes.subarray(from, to));
  if (type === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === "image/png") return bytes[0] === 0x89 && ascii(1, 4) === "PNG";
  if (type === "image/webp") return ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP";
  return false;
}

function base64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}
