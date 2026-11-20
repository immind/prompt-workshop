import { z } from "zod";
import type { ChatMessage } from "./ai";
import type { generateInput, imageInput } from "./options";

const PLAIN =
  "Reply with the prompt text only: no preamble, no notes about what you did, no surrounding quotes.";

const MODE_RULES = {
  Simple:
    "Write a short, direct prompt of two to four sentences that states the task and the most important detail.",
  Advanced:
    "Write a structured prompt with these labelled sections: Role, Context, Task, Constraints, Output format. Keep each section to a few lines.",
  Expert:
    "Write a thorough structured prompt with these labelled sections: Role, Context, Task, Steps (a numbered list the model should follow), Constraints, Output format, Quality criteria (how a good answer is judged). Fill each section with concrete detail inferred from the idea.",
} as const;

function targetRule(target: string): string {
  if (target === "Any") return "The prompt should work well with any modern chat model.";
  return `The prompt will be used with ${target}; phrase it in the way ${target} follows best.`;
}

/** Turns a member's idea into a ready-to-use prompt. */
export function generateMessages(
  input: z.infer<typeof generateInput>,
): ChatMessage[] {
  return [
    {
      role: "system",
      content: [
        "You are a prompt engineer. Turn the user's idea into a prompt they can paste into an AI assistant.",
        MODE_RULES[input.mode],
        targetRule(input.target),
        "Write the prompt in the same language as the idea.",
        PLAIN,
      ].join("\n"),
    },
    { role: "user", content: `Idea: ${oneLine(input.idea)}` },
  ];
}

/** Revises the latest version with a follow-up instruction. */
export function refineMessages(
  current: string,
  instruction: string,
  options: { mode?: string; target?: string },
): ChatMessage[] {
  return [
    {
      role: "system",
      content: [
        "You are a prompt engineer. Revise the prompt below as the user asks, keeping everything they did not ask to change.",
        options.target ? targetRule(options.target) : "",
        PLAIN,
      ]
        .filter(Boolean)
        .join("\n"),
    },
    {
      role: "user",
      content: `Current prompt:\n${current}\n\nChange request: ${oneLine(instruction)}`,
    },
  ];
}

/** Asks for a review of a prompt as one JSON object. */
export function checkMessages(prompt: string): ChatMessage[] {
  return [
    {
      role: "system",
      content: [
        "You review prompts written for AI assistants. Judge clarity, context, specificity, constraints and the requested output format.",
        'Answer with one JSON object and nothing else, shaped as {"score": number from 0 to 100, "strengths": [string], "problems": [{"problem": string, "impact": string}], "improved": string}.',
        "Each impact explains how the problem hurts the answers the prompt gets. improved is a rewritten prompt that fixes every problem.",
        "Write in the same language as the prompt.",
      ].join("\n"),
    },
    { role: "user", content: `Prompt to review:\n${prompt}` },
  ];
}

export const checkReport = z.object({
  score: z.coerce.number().min(0).max(100).transform(Math.round),
  strengths: z.array(z.string().trim().min(1)).max(20),
  problems: z
    .array(
      z.object({
        problem: z.string().trim().min(1),
        impact: z.string().trim().min(1),
      }),
    )
    .max(20),
  improved: z.string().trim().min(1),
});
export type CheckReport = z.infer<typeof checkReport>;

export const LEVELS = ["Weak", "Fair", "Good", "Excellent"] as const;

/** The quality level a score falls in. */
export function levelFor(score: number): (typeof LEVELS)[number] {
  if (score >= 85) return "Excellent";
  if (score >= 70) return "Good";
  if (score >= 45) return "Fair";
  return "Weak";
}

/** The review in a model's answer, or null when there is none to read. */
export function parseCheckReport(answer: string): CheckReport | null {
  const start = answer.indexOf("{");
  const end = answer.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(answer.slice(start, end + 1));
  } catch {
    return null;
  }
  const result = checkReport.safeParse(parsed);
  return result.success ? result.data : null;
}

/** Writes a detailed image-generation prompt from a description and fixed choices. */
export function imageMessages(input: z.infer<typeof imageInput>): ChatMessage[] {
  const choices = [
    `Style: ${input.style}`,
    `Aspect ratio: ${input.aspectRatio}`,
    `Camera angle: ${input.camera}`,
    `Lighting: ${input.lighting}`,
    input.quality.length ? `Quality: ${input.quality.join(", ")}` : "",
  ].filter(Boolean);
  return [
    {
      role: "system",
      content: [
        "You write prompts for image generators. Expand the user's description into one detailed paragraph covering subject, setting, composition, colours and mood.",
        "Work in every choice given: the style, the camera angle, the lighting and the quality terms. Do not include things to avoid.",
        PLAIN,
      ].join("\n"),
    },
    {
      role: "user",
      content: `Description: ${oneLine(input.description)}\n${choices.join("\n")}`,
    },
  ];
}

/** The final image prompt: the model's paragraph with the choices made explicit. */
export function finishImagePrompt(
  paragraph: string,
  input: z.infer<typeof imageInput>,
): string {
  const tags = [
    `${input.style} style`,
    input.camera,
    input.lighting,
    ...input.quality,
  ].join(", ");
  return `${paragraph}\n\n${tags}\nAspect ratio ${input.aspectRatio}`;
}

/** Asks a vision model for a prompt that would recreate an image. */
export function describeMessages(dataUrl: string): ChatMessage[] {
  return [
    {
      role: "system",
      content: [
        "You write prompts for image generators. Look at the image and write one prompt that would recreate it.",
        "Cover the subject, style, lighting, colours, mood and composition, as a comma-separated description an image tool understands.",
        PLAIN,
      ].join("\n"),
    },
    {
      role: "user",
      content: [
        { type: "text", text: "Write a prompt for this image." },
        { type: "image_url", image_url: { url: dataUrl } },
      ],
    },
  ];
}

function oneLine(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}
