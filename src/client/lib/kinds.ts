import type { Kind } from "@/server/options";

/** What each kind of history entry is called on screen. */
export const KIND_LABELS: Record<Kind, string> = {
  generate: "Generated",
  check: "Check",
  image: "Image prompt",
  image_to_prompt: "Image to prompt",
};

/** The history filter's choices, by kind. */
export const KIND_FILTERS: { value: Kind | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "generate", label: "Generated" },
  { value: "check", label: "Checks" },
  { value: "image", label: "Image prompts" },
  { value: "image_to_prompt", label: "Image to prompt" },
];

export function formatWhen(time: number): string {
  return new Date(time).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
