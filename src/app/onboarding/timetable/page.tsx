import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import {
  academicGroup,
  course,
  courseVariant,
  electiveGroup,
  electiveOption,
  groupMembership,
  timetableEntry,
} from "@/db/schema";
import { requireStudent } from "@/lib/auth/require-student";
import { finishTimetable } from "./actions";
import { TimetableGrid } from "./timetable-grid";
import type { CellDraft } from "./actions";

export default async function TimetableBuilderPage({
  searchParams,
}: {
  searchParams: Promise<{ groupId?: string }>;
}) {
  const student = await requireStudent();
  const { groupId } = await searchParams;
  if (!groupId) redirect("/onboarding");

  const membership = await db
    .select({ id: groupMembership.id })
    .from(groupMembership)
    .where(and(eq(groupMembership.studentId, student.id), eq(groupMembership.groupId, groupId)))
    .limit(1);
  if (!membership[0]) redirect("/onboarding");

  const [group] = await db.select().from(academicGroup).where(eq(academicGroup.id, groupId)).limit(1);
  if (!group) redirect("/onboarding");

  const entries = await db
    .select({
      dayOfWeek: timetableEntry.dayOfWeek,
      period: timetableEntry.period,
      kind: timetableEntry.kind,
      label: timetableEntry.label,
      electiveGroupId: timetableEntry.electiveGroupId,
      abbrev: courseVariant.abbrev,
      isLab: courseVariant.isLab,
      code: course.code,
      name: course.name,
    })
    .from(timetableEntry)
    .leftJoin(courseVariant, eq(courseVariant.id, timetableEntry.courseVariantId))
    .leftJoin(course, eq(course.id, courseVariant.courseId))
    .where(eq(timetableEntry.groupId, groupId));

  const electiveRows = await db
    .select({
      electiveGroupId: electiveGroup.id,
      label: electiveGroup.label,
      code: course.code,
      name: course.name,
    })
    .from(electiveOption)
    .innerJoin(electiveGroup, eq(electiveGroup.id, electiveOption.electiveGroupId))
    .innerJoin(course, eq(course.id, electiveOption.courseId))
    .where(eq(electiveGroup.groupId, groupId));

  const electivesById = new Map<string, { label: string; options: { code: string; name: string }[] }>();
  for (const row of electiveRows) {
    const entry = electivesById.get(row.electiveGroupId) ?? { label: row.label, options: [] };
    entry.options.push({ code: row.code, name: row.name });
    electivesById.set(row.electiveGroupId, entry);
  }

  const initialCells: Record<string, CellDraft> = {};
  for (const row of entries) {
    const key = `${row.dayOfWeek}-${row.period}`;
    if (row.kind === "course" && row.code && row.name && row.abbrev !== null) {
      initialCells[key] = { kind: "course", code: row.code, name: row.name, abbrev: row.abbrev, isLab: row.isLab ?? false };
    } else if (row.kind === "elective" && row.electiveGroupId) {
      const e = electivesById.get(row.electiveGroupId);
      initialCells[key] = {
        kind: "elective",
        label: e?.label ?? "",
        optionA: e?.options[0] ?? { code: "", name: "" },
        optionB: e?.options[1] ?? { code: "", name: "" },
      };
    } else if (row.kind === "activity" || row.kind === "admin") {
      initialCells[key] = { kind: row.kind, label: row.label ?? "" };
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <h1 className="text-xl font-semibold">Build the timetable — {group.department} {group.year}{group.section}</h1>
      <p className="mt-1 text-sm text-gray-600">
        Tap a cell, pick what runs there. This becomes the whole section&apos;s timetable — you can fix mistakes
        later, and so can they.
      </p>
      <TimetableGrid groupId={groupId} initialCells={initialCells} />
      <form action={finishTimetable.bind(null, groupId)} className="mt-6">
        <button type="submit" className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white">
          Continue
        </button>
      </form>
    </main>
  );
}
