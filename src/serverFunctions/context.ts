import { isAdmin, type EveryAppUser } from "@every-app/sdk/server";
import { rememberMember } from "@/server/members";

/** The signed-in member as the queries take them, recorded on first sight. */
export async function viewerOf(user: EveryAppUser) {
  await rememberMember(user);
  return { id: user.id, orgId: user.orgId, admin: isAdmin(user) };
}

/** Accepts any plain object; each handler validates it with its schema. */
export function anObject(data: unknown): Record<string, unknown> {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Expected an object.");
  }
  return data as Record<string, unknown>;
}

export type Outcome<T> =
  | ({ ok: true } & T)
  | { ok: false; error: string; field?: string };
