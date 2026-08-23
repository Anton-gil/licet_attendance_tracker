"use server";

import { eq, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { electiveGroup, groupMembership, studentElectiveChoice } from "@/db/schema";
import { requireStudent } from "@/lib/auth/require-student";

export async function saveElectiveChoices(groupId: string, formData: FormData) {
  const student = await requireStudent();

  // `elective:<electiveGroupId>` form field names are client-controlled —
  // a forged request could name any elective group in the database, not
  // just ones belonging to a group this student is actually in. Load the
  // student's own memberships and only accept elective groups that belong
  // to one of them.
  const memberships = await db
    .select({ groupId: groupMembership.groupId })
    .from(groupMembership)
    .where(eq(groupMembership.studentId, student.id));
  const memberGroupIds = new Set(memberships.map((m) => m.groupId));

  const entries = Array.from(formData.entries()).filter(([key]) => key.startsWith("elective:"));
  const electiveGroupIds = entries.map(([key]) => key.slice("elective:".length));

  const validElectiveGroups = electiveGroupIds.length
    ? await db.select().from(electiveGroup).where(inArray(electiveGroup.id, electiveGroupIds))
    : [];
  const ownedElectiveGroupIds = new Set(
    validElectiveGroups.filter((eg) => memberGroupIds.has(eg.groupId)).map((eg) => eg.id),
  );

  for (const [key, value] of entries) {
    const electiveGroupId = key.slice("elective:".length);
    if (!ownedElectiveGroupIds.has(electiveGroupId)) continue;

    const courseId = String(value);
    if (!courseId) continue;
    await db
      .insert(studentElectiveChoice)
      .values({ studentId: student.id, electiveGroupId, courseId })
      .onConflictDoUpdate({
        target: [studentElectiveChoice.studentId, studentElectiveChoice.electiveGroupId],
        set: { courseId },
      });
  }

  void groupId;
  redirect("/dashboard");
}
