import { z } from "zod";

// The fixed lists every tool's options come from. The server accepts nothing else.
export const MODES = ["Simple", "Advanced", "Expert"] as const;
export const TARGETS = ["Any", "ChatGPT", "Claude", "Gemini", "DeepSeek"] as const;
export const STYLES = [
  "Realistic",
  "Cinematic",
  "3D",
  "Cartoon",
  "Minimal",
  "Luxury",
  "Tech",
  "Anime",
] as const;
export const ASPECT_RATIOS = ["16:9", "1:1", "9:16", "4:5", "3:2"] as const;
export const CAMERA_ANGLES = [
  "Eye level",
  "Low angle",
  "High angle",
  "Close-up",
  "Wide shot",
  "Aerial view",
  "Over the shoulder",
] as const;
export const LIGHTING = [
  "Natural light",
  "Golden hour",
  "Studio lighting",
  "Soft diffused",
  "Dramatic shadows",
  "Neon glow",
  "Backlit",
] as const;
export const QUALITY_TERMS = [
  "Highly detailed",
  "Sharp focus",
  "8K resolution",
  "Professional photography",
  "Rich textures",
  "HDR",
] as const;
export const CATEGORIES = [
  "Marketing",
  "Writing",
  "Coding",
  "Business",
  "Education",
  "Image",
  "Other",
] as const;
export const KINDS = ["generate", "check", "image", "image_to_prompt"] as const;
export type Kind = (typeof KINDS)[number];

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const text = (max: number, what: string) =>
  z
    .string()
    .trim()
    .min(1, `Enter ${what}.`)
    .max(max, `Keep it to ${max} characters.`);

export const generateInput = z
  .object({
    idea: text(500, "an idea"),
    mode: z.enum(MODES),
    target: z.enum(TARGETS),
  })
  .strict();

export const refineInput = z
  .object({ id: z.string().uuid(), instruction: text(300, "a change") })
  .strict();

export const checkInput = z.object({ prompt: text(500, "a prompt") }).strict();

export const imageInput = z
  .object({
    description: text(500, "a description"),
    style: z.enum(STYLES),
    aspectRatio: z.enum(ASPECT_RATIOS),
    camera: z.enum(CAMERA_ANGLES),
    lighting: z.enum(LIGHTING),
    quality: z.array(z.enum(QUALITY_TERMS)).max(QUALITY_TERMS.length),
    negative: z.string().trim().max(300, "Keep it to 300 characters."),
  })
  .strict();

export const libraryInput = z
  .object({
    title: text(120, "a title"),
    category: z.enum(CATEGORIES),
    body: text(4000, "the prompt"),
  })
  .strict();
