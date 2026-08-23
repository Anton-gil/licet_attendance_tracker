"use server";

import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { academicGroup, course, courseVariant, electiveGroup, electiveOption, timetableEntry } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { requireStudent } from "@/lib/auth/require-student";
import { requireGroupMembership } from "@/lib/auth/require-group-membership";

export type CellDraft =
  | { kind: "empty" }
  | { kind: "course"; code: string; name: string; abbrev: string; isLab: boolean }
  | {
      kind: "elective";
      label: string;
      optionA: { code: string; name: string };
      optionB: { code: string; name: string };
    }
  | { kind: "activity" | "admin"; label: string };

async function findOrCreateCourse(groupId: string, code: string, name: string) {
  const existing = await db
    .select()
    .from(course)
    .where(and(eq(course.groupId, groupId), eq(course.code, code)))
    .limit(1);
  if (existing[0]) return existing[0];

  await db.insert(course).values({ groupId, code, name }).onConflictDoNothing();
  const [row] = await db
    .select()
    .from(course)
    .where(and(eq(course.groupId, groupId), eq(course.code, code)))
    .limit(1);
  return row;
}

async function findOrCreateCourseVariant(courseId: string, abbrev: string, isLab: boolean) {
  const existing = await db
    .select()
    .from(courseVariant)
    .where(and(eq(courseVariant.courseId, courseId), eq(courseVariant.abbrev, abbrev)))
    .limit(1);
  if (existing[0]) return existing[0];

  await db.insert(courseVariant).values({ courseId, abbrev, isLab }).onConflictDoNothing();
  const [row] = await db
    .select()
    .from(courseVariant)
    .where(and(eq(courseVariant.courseId, courseId), eq(courseVariant.abbrev, abbrev)))
    .limit(1);
  return row;
}

async function findOrCreateElectiveGroup(groupId: string, label: string) {
  const existing = await db
    .select()
    .from(electiveGroup)
    .where(and(eq(electiveGroup.groupId, groupId), eq(electiveGroup.label, label)))
    .limit(1);
  if (existing[0]) return existing[0];

  await db.insert(electiveGroup).values({ groupId, label }).onConflictDoNothing();
  const [row] = await db
    .select()
    .from(electiveGroup)
    .where(and(eq(electiveGroup.groupId, groupId), eq(electiveGroup.label, label)))
    .limit(1);
  return row;
}

async function ensureElectiveOption(electiveGroupId: string, courseId: string) {
  await db.insert(electiveOption).values({ electiveGroupId, courseId }).onConflictDoNothing();
}

export async function saveCell(
  groupId: string,
  dayOfWeek: number,
  period: number,
  draft: CellDraft,
): Promise<void> {
  // A server action is a public endpoint regardless of which page renders
  // the button that calls it — the page's own membership check does not
  // protect this. Without this, any signed-in (or, before this fix,
  // *any* — there was no requireStudent() call here at all) request could
  // vandalize an arbitrary group's timetable by guessing/enumerating a
  // groupId.
  const student = await requireStudent();
  await requireGroupMembership(student.id, groupId);

  if (draft.kind === "empty") {
    await db
      .delete(timetableEntry)
      .where(
        and(
          eq(timetableEntry.groupId, groupId),
          eq(timetableEntry.dayOfWeek, dayOfWeek),
          eq(timetableEntry.period, period),
        ),
      );
    revalidatePath("/onboarding/timetable");
    return;
  }

  if (draft.kind === "course") {
    const c = await findOrCreateCourse(groupId, draft.code, draft.name);
    const variant = await findOrCreateCourseVariant(c.id, draft.abbrev, draft.isLab);
    await upsertEntry(groupId, dayOfWeek, period, {
      kind: "course",
      courseVariantId: variant.id,
      electiveGroupId: null,
      label: null,
    });
  } else if (draft.kind === "elective") {
    const eg = await findOrCreateElectiveGroup(groupId, draft.label);
    const courseA = await findOrCreateCourse(groupId, draft.optionA.code, draft.optionA.name);
    const courseB = await findOrCreateCourse(groupId, draft.optionB.code, draft.optionB.name);
    await ensureElectiveOption(eg.id, courseA.id);
    await ensureElectiveOption(eg.id, courseB.id);
    await upsertEntry(groupId, dayOfWeek, period, {
      kind: "elective",
      courseVariantId: null,
      electiveGroupId: eg.id,
      label: null,
    });
  } else {
    await upsertEntry(groupId, dayOfWeek, period, {
      kind: draft.kind,
      courseVariantId: null,
      electiveGroupId: null,
      label: draft.label,
    });
  }

  revalidatePath("/onboarding/timetable");
}

export async function finishTimetable(groupId: string) {
  const student = await requireStudent();
  await requireGroupMembership(student.id, groupId);

  // Manual entry is the trusted path — no crowd verification needed the
  // way an upload does (§9.5), but it's one student's work on behalf of
  // the whole section, so it starts life as 'provisional' rather than
  // jumping straight to 'verified'.
  await db
    .update(academicGroup)
    .set({ timetableStatus: "provisional" })
    .where(and(eq(academicGroup.id, groupId), eq(academicGroup.timetableStatus, "none")));
  redirect(`/onboarding/electives?groupId=${groupId}`);
}

async function upsertEntry(
  groupId: string,
  dayOfWeek: number,
  period: number,
  values: {
    kind: "course" | "elective" | "activity" | "admin";
    courseVariantId: string | null;
    electiveGroupId: string | null;
    label: string | null;
  },
) {
  await db
    .insert(timetableEntry)
    .values({ groupId, dayOfWeek, period, ...values })
    .onConflictDoUpdate({
      target: [timetableEntry.groupId, timetableEntry.dayOfWeek, timetableEntry.period],
      set: values,
    });
}
