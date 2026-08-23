"use server";

import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { academicGroup, groupMembership, student as studentTable } from "@/db/schema";
import { ACADEMIC_YEAR, CALENDAR_TRACKS } from "@/db/seed/calendar-data";
import { ODD_SEM_2026 } from "@/config/college";
import { requireStudent } from "@/lib/auth/require-student";
import { todayIST } from "@/lib/date/ist";

const UNIQUE_VIOLATION = "23505";

/** Best known commencement date for this year of study — undefined (not null) means "genuinely unseeded," handled by the caller. */
function defaultWefDate(year: number): string | null {
  const track = CALENDAR_TRACKS.find((t) => t.appliesToYears.includes(year));
  if (!track) return null;
  const commencement = ODD_SEM_2026.commencement[track.key as keyof typeof ODD_SEM_2026.commencement];
  return commencement ?? null;
}

export async function joinOrCreateGroup(formData: FormData) {
  const student = await requireStudent();

  const department = String(formData.get("department") ?? "").trim().toUpperCase();
  const year = Number(formData.get("year"));
  const section = String(formData.get("section") ?? "").trim().toUpperCase();
  const semester = Number(formData.get("semester"));

  if (!department || !section || !Number.isInteger(year) || !Number.isInteger(semester)) {
    throw new Error("Fill in department, year, section and semester.");
  }

  const group = await findOrCreateGroup({ department, year, section, semester, createdBy: student.id });

  await db
    .insert(groupMembership)
    .values({ studentId: student.id, groupId: group.id, validFrom: todayIST() })
    .onConflictDoNothing();

  // §5: semester_start_date "defaults to group.wef_date." Set once, on
  // first join, and never overwritten after — a student who transfers
  // groups later keeps their original semester start (spec §6: history is
  // resolved via group_membership ranges, not by re-deriving this field).
  // If the year's commencement date genuinely isn't known yet (an
  // unseeded FY/IV track), fall back to today rather than leaving it
  // null forever or guessing a date nobody confirmed — see smoke test #9.
  if (!student.semesterStartDate) {
    await db
      .update(studentTable)
      .set({ semesterStartDate: group.wefDate ?? todayIST() })
      .where(and(eq(studentTable.id, student.id)));
  }

  redirect(`/onboarding/timetable?groupId=${group.id}`);
}

async function findOrCreateGroup(args: {
  department: string;
  year: number;
  section: string;
  semester: number;
  createdBy: string;
}): Promise<{ id: string; wefDate: string | null }> {
  const existing = await db
    .select({ id: academicGroup.id, wefDate: academicGroup.wefDate })
    .from(academicGroup)
    .where(
      and(
        eq(academicGroup.academicYear, ACADEMIC_YEAR),
        eq(academicGroup.department, args.department),
        eq(academicGroup.year, args.year),
        eq(academicGroup.section, args.section),
        eq(academicGroup.semester, args.semester),
      ),
    )
    .limit(1);
  if (existing[0]) return existing[0];

  try {
    const [created] = await db
      .insert(academicGroup)
      .values({
        academicYear: ACADEMIC_YEAR,
        department: args.department,
        year: args.year,
        section: args.section,
        semester: args.semester,
        createdBy: args.createdBy,
        wefDate: defaultWefDate(args.year),
      })
      .returning({ id: academicGroup.id, wefDate: academicGroup.wefDate });
    return created;
  } catch (err: unknown) {
    // Race on first creation (spec §20) — someone else's insert won, so
    // just join theirs instead of erroring.
    if (isUniqueViolation(err)) {
      const [row] = await db
        .select({ id: academicGroup.id, wefDate: academicGroup.wefDate })
        .from(academicGroup)
        .where(
          and(
            eq(academicGroup.academicYear, ACADEMIC_YEAR),
            eq(academicGroup.department, args.department),
            eq(academicGroup.year, args.year),
            eq(academicGroup.section, args.section),
            eq(academicGroup.semester, args.semester),
          ),
        )
        .limit(1);
      if (row) return row;
    }
    throw err;
  }
}

function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && (err as { code?: string }).code === UNIQUE_VIOLATION;
}
