"use server";

import { and, eq, gte, isNull, lte, or, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { bugReport, featureRequest, featureVote, groupMembership } from "@/db/schema";
import { requireStudent } from "@/lib/auth/require-student";
import { todayIST } from "@/lib/date/ist";

async function currentGroupId(studentId: string): Promise<string | null> {
  const today = todayIST();
  const rows = await db
    .select({ groupId: groupMembership.groupId })
    .from(groupMembership)
    .where(
      and(
        eq(groupMembership.studentId, studentId),
        lte(groupMembership.validFrom, today),
        or(isNull(groupMembership.validTo), gte(groupMembership.validTo, today)),
      ),
    )
    .limit(1);
  return rows[0]?.groupId ?? null;
}

export async function submitBugReport(formData: FormData) {
  const student = await requireStudent();
  const groupId = await currentGroupId(student.id);

  await db.insert(bugReport).values({
    studentId: student.id,
    groupId,
    description: String(formData.get("description") ?? ""),
    expected: String(formData.get("expected") ?? "") || null,
    actual: String(formData.get("actual") ?? "") || null,
    context: {
      route: String(formData.get("route") ?? ""),
      userAgent: String(formData.get("userAgent") ?? ""),
      // created_at on the row already timestamps this — no need to duplicate it here.
      buildSha: process.env.VERCEL_GIT_COMMIT_SHA ?? "dev",
    },
  });

  revalidatePath("/feedback");
}

export async function submitFeatureRequest(formData: FormData) {
  const student = await requireStudent();

  await db.insert(featureRequest).values({
    studentId: student.id,
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? "") || null,
  });

  revalidatePath("/feedback");
}

export async function toggleVote(requestId: string) {
  const student = await requireStudent();

  const existing = await db
    .select()
    .from(featureVote)
    .where(and(eq(featureVote.requestId, requestId), eq(featureVote.studentId, student.id)))
    .limit(1);

  if (existing[0]) {
    await db.delete(featureVote).where(and(eq(featureVote.requestId, requestId), eq(featureVote.studentId, student.id)));
    await db
      .update(featureRequest)
      .set({ voteCount: sqlDecrement() })
      .where(eq(featureRequest.id, requestId));
  } else {
    await db.insert(featureVote).values({ requestId, studentId: student.id }).onConflictDoNothing();
    await db
      .update(featureRequest)
      .set({ voteCount: sqlIncrement() })
      .where(eq(featureRequest.id, requestId));
  }

  revalidatePath("/feedback");
}

// Raw SQL expressions to increment/decrement vote_count in place.
function sqlIncrement() {
  return sql`${featureRequest.voteCount} + 1`;
}
function sqlDecrement() {
  return sql`greatest(${featureRequest.voteCount} - 1, 0)`;
}
