import { eq } from "drizzle-orm";
import { db } from "@/db";
import { groupMembership } from "@/db/schema";
import { isMemberOfGroup } from "./is-member-of-group";

/**
 * Every server action that receives a `groupId` (or anything scoped to
 * one) from the client must call this before writing — a client-supplied
 * id is not proof of membership, and a "use server" action is a public
 * endpoint regardless of what UI happens to call it. Throws, which
 * surfaces as a generic error boundary; these are POST bodies from a
 * signed-in session doing something it has no business doing, not a
 * user-facing error state that needs its own copy.
 */
export async function requireGroupMembership(studentId: string, groupId: string): Promise<void> {
  const memberships = await db
    .select({ groupId: groupMembership.groupId })
    .from(groupMembership)
    .where(eq(groupMembership.studentId, studentId));

  if (!isMemberOfGroup(memberships, groupId)) {
    throw new Error("Not a member of this group.");
  }
}
