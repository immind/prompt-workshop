import { db } from "@/db";
import { members } from "@/db/schema";

interface Identity {
  id: string;
  email: string;
  orgId: string;
}

/** Records the member on first sight and keeps their email current. */
export async function rememberMember(user: Identity): Promise<void> {
  await db
    .insert(members)
    .values({ id: user.id, orgId: user.orgId, email: user.email })
    .onConflictDoUpdate({
      target: members.id,
      set: { email: user.email, orgId: user.orgId },
    });
}
