import { env } from "cloudflare:workers";
import {
  aiBaseUrl,
  createGatewayFetch,
  gatewayRefusal,
  refusalFromError,
} from "@every-app/sdk/server";

type Part =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string | Part[];
}

/** A model call that failed, with a sentence a member can read. */
export class AiError extends Error {}

const NOT_SET_UP = ["ai_default_not_configured", "ai_provider_not_configured"];

/** The model's answer, through the Gateway's default chat model. */
export async function chat(messages: ChatMessage[]): Promise<string> {
  let response: Response;
  try {
    const fetchVia = createGatewayFetch({ env });
    response = await fetchVia(`${aiBaseUrl()}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ model: "default", messages, temperature: 0.7 }),
    });
  } catch (error) {
    const refusal = refusalFromError(error);
    if (refusal) throw new AiError(sentenceFor(refusal));
    throw new AiError("The model couldn't be reached. Try again.");
  }
  if (!response.ok) {
    const refusal = await gatewayRefusal(response);
    if (refusal) throw new AiError(sentenceFor(refusal));
    throw new AiError("The model didn't answer. Try again.");
  }
  const body = (await response.json().catch(() => null)) as {
    choices?: { message?: { content?: unknown } }[];
  } | null;
  const content = body?.choices?.[0]?.message?.content;
  const answer = typeof content === "string" ? content.trim() : "";
  if (!answer) throw new AiError("The model sent back an empty answer. Try again.");
  return answer;
}

function sentenceFor(refusal: {
  code: string;
  message: string;
  setup: string | null;
}): string {
  if (NOT_SET_UP.includes(refusal.code)) {
    return refusal.setup ?? "No AI model is set up on your Gateway yet.";
  }
  if (refusal.code === "app_monthly_cap_exceeded") {
    return "This app has used its AI budget for the month.";
  }
  return refusal.message || "The model didn't answer. Try again.";
}
