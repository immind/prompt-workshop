import { createServerFn } from "@tanstack/react-start";
import { ensureUserMiddleware } from "@every-app/sdk/tanstack-start";
import { AiError, chat } from "@/server/ai";
import * as entries from "@/server/entries";
import { checkInput, generateInput, imageInput, refineInput } from "@/server/options";
import {
  checkMessages,
  finishImagePrompt,
  generateMessages,
  imageMessages,
  levelFor,
  parseCheckReport,
  refineMessages,
} from "@/server/prompts";
import { anObject, viewerOf, type Outcome } from "./context";

async function ask<T>(work: () => Promise<T>): Promise<Outcome<{ entry: T }>> {
  try {
    return { ok: true, entry: await work() };
  } catch (error) {
    if (error instanceof AiError) return { ok: false, error: error.message };
    throw error;
  }
}

export const generatePrompt = createServerFn({ method: "POST" })
  .middleware([ensureUserMiddleware])
  .validator(anObject)
  .handler(async ({ data, context }) => {
    const parsed = generateInput.safeParse(data);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]!.message, field: "idea" } as const;
    }
    const viewer = await viewerOf(context.user);
    return ask(async () => {
      const output = await chat(generateMessages(parsed.data));
      return entries.createEntry(viewer.id, {
        kind: "generate",
        input: parsed.data.idea,
        options: { mode: parsed.data.mode, target: parsed.data.target },
        output,
      });
    });
  });

export const refinePrompt = createServerFn({ method: "POST" })
  .middleware([ensureUserMiddleware])
  .validator(anObject)
  .handler(async ({ data, context }) => {
    const parsed = refineInput.safeParse(data);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]!.message, field: "instruction" } as const;
    }
    const viewer = await viewerOf(context.user);
    const current = await entries.getEntry(viewer.id, parsed.data.id);
    if (!current || current.kind !== "generate") {
      return { ok: false, error: "That prompt is no longer in your history." } as const;
    }
    return ask(async () => {
      const output = await chat(
        refineMessages(current.output, parsed.data.instruction, current.options as { target?: string }),
      );
      const updated = await entries.addVersion(viewer.id, current.id, output, parsed.data.instruction);
      if (!updated) throw new AiError("That prompt is no longer in your history.");
      return updated;
    });
  });

export const checkPrompt = createServerFn({ method: "POST" })
  .middleware([ensureUserMiddleware])
  .validator(anObject)
  .handler(async ({ data, context }) => {
    const parsed = checkInput.safeParse(data);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]!.message, field: "prompt" } as const;
    }
    const viewer = await viewerOf(context.user);
    return ask(async () => {
      const report = parseCheckReport(await chat(checkMessages(parsed.data.prompt)));
      if (!report) throw new AiError("The review came back in a form the app couldn't read. Try again.");
      return entries.createEntry(viewer.id, {
        kind: "check",
        input: parsed.data.prompt,
        output: report.improved,
        details: {
          level: levelFor(report.score),
          score: report.score,
          strengths: report.strengths,
          problems: report.problems,
        },
      });
    });
  });

export const buildImagePrompt = createServerFn({ method: "POST" })
  .middleware([ensureUserMiddleware])
  .validator(anObject)
  .handler(async ({ data, context }) => {
    const parsed = imageInput.safeParse(data);
    if (!parsed.success) {
      const issue = parsed.error.issues[0]!;
      return { ok: false, error: issue.message, field: String(issue.path[0] ?? "description") } as const;
    }
    const viewer = await viewerOf(context.user);
    const { description, negative, ...options } = parsed.data;
    return ask(async () => {
      const paragraph = await chat(imageMessages(parsed.data));
      return entries.createEntry(viewer.id, {
        kind: "image",
        input: description,
        options,
        output: finishImagePrompt(paragraph, parsed.data),
        details: { negative },
      });
    });
  });
