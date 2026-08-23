import { eq } from "drizzle-orm";
import { db } from "@/db";
import { studentElectiveChoice, timetableEntry } from "@/db/schema";
import { unresolvedElectiveGroupIds } from "./unresolved-elective-group-ids";

/**
 * A student can't reach the dashboard with an elective slot unresolved —
 * PE-1 alone is ~80 periods/semester (~12% of the total), and an unpicked
 * elective silently falls into "Other" with no course percentage at all
 * (spec §4/§3), which is a materially wrong dashboard, not just an
 * incomplete one.
 */
export async function findUnresolvedElectiveGroupIds(studentId: string, groupId: string): Promise<string[]> {
  const requiredRows = await db
    .select({ electiveGroupId: timetableEntry.electiveGroupId })
    .from(timetableEntry)
    .where(eq(timetableEntry.groupId, groupId));
  const required = requiredRows
    .map((r) => r.electiveGroupId)
    .filter((id): id is string => id !== null);

  if (required.length === 0) return [];

  const chosenRows = await db
    .select({ electiveGroupId: studentElectiveChoice.electiveGroupId })
    .from(studentElectiveChoice)
    .where(eq(studentElectiveChoice.studentId, studentId));

  return unresolvedElectiveGroupIds(required, chosenRows.map((r) => r.electiveGroupId));
}
