import { and, eq, gte, lte, or, isNull } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/db";
import {
  attendanceException,
  calendarOverride,
  course,
  courseVariant,
  electiveGroup,
  groupMembership,
  studentElectiveChoice,
  timetableEntry,
} from "@/db/schema";
import { requireStudent } from "@/lib/auth/require-student";
import { addDays, todayIST } from "@/lib/date/ist";
import { resolveDate } from "@/lib/date/resolve-date";
import { DateOverrideControl } from "./date-override-control";
import { PeriodMarker } from "./period-marker";

export default async function AttendanceDayPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const student = await requireStudent();
  const { date: dateParam } = await searchParams;
  const date = dateParam ?? todayIST();

  const resolution = await resolveDate(date, student.id);

  const overrideRow = await db
    .select({ id: calendarOverride.id })
    .from(calendarOverride)
    .where(and(eq(calendarOverride.scope, "student"), eq(calendarOverride.studentId, student.id), eq(calendarOverride.date, date)))
    .limit(1);

  let rows: {
    period: number;
    kind: string;
    label: string | null;
    electiveGroupId: string | null;
    electiveLabel: string | null;
    abbrev: string | null;
    code: string | null;
  }[] = [];

  if (resolution.isInstruction && resolution.effectiveDow) {
    const membership = await db
      .select({ groupId: groupMembership.groupId })
      .from(groupMembership)
      .where(
        and(
          eq(groupMembership.studentId, student.id),
          lte(groupMembership.validFrom, date),
          or(isNull(groupMembership.validTo), gte(groupMembership.validTo, date)),
        ),
      )
      .limit(1);

    if (membership[0]) {
      rows = await db
        .select({
          period: timetableEntry.period,
          kind: timetableEntry.kind,
          label: timetableEntry.label,
          electiveGroupId: timetableEntry.electiveGroupId,
          electiveLabel: electiveGroup.label,
          abbrev: courseVariant.abbrev,
          code: course.code,
        })
        .from(timetableEntry)
        .leftJoin(courseVariant, eq(courseVariant.id, timetableEntry.courseVariantId))
        .leftJoin(course, eq(course.id, courseVariant.courseId))
        .leftJoin(electiveGroup, eq(electiveGroup.id, timetableEntry.electiveGroupId))
        .where(
          and(
            eq(timetableEntry.groupId, membership[0].groupId),
            eq(timetableEntry.dayOfWeek, resolution.effectiveDow),
          ),
        )
        .orderBy(timetableEntry.period);
    }
  }

  const electiveChoices = await db
    .select({ electiveGroupId: studentElectiveChoice.electiveGroupId, code: course.code, name: course.name })
    .from(studentElectiveChoice)
    .innerJoin(course, eq(course.id, studentElectiveChoice.courseId))
    .where(eq(studentElectiveChoice.studentId, student.id));
  const electiveChoiceByGroup = new Map(electiveChoices.map((c) => [c.electiveGroupId, c]));

  const exceptions = await db
    .select()
    .from(attendanceException)
    .where(and(eq(attendanceException.studentId, student.id), eq(attendanceException.date, date)));
  const statusByPeriod = new Map(exceptions.map((e) => [e.period, e.status]));

  return (
    <main className="mx-auto max-w-2xl px-6 py-8">
      <div className="mb-4 flex items-center justify-between">
        <Link href={`/attendance?date=${addDays(date, -1)}`} className="text-sm text-gray-500">
          ← Prev
        </Link>
        <h1 className="text-lg font-semibold">{date}</h1>
        <Link href={`/attendance?date=${addDays(date, 1)}`} className="text-sm text-gray-500">
          Next →
        </Link>
      </div>

      {resolution.confidence !== "exact" && resolution.confidence !== "official" && (
        <p className="mb-4 rounded bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Working days assumed from the academic calendar ({resolution.confidence}) — your year&apos;s may differ.
        </p>
      )}

      {!resolution.isInstruction ? (
        <p className="mb-4 text-sm text-gray-600">
          No class today{resolution.label ? ` — ${resolution.label}` : ""}.
        </p>
      ) : rows.length === 0 ? (
        <p className="mb-4 text-sm text-gray-600">No timetable set for this day yet.</p>
      ) : (
        <ul className="mb-6 flex flex-col gap-2">
          {rows.map((row) => {
            const isOther = row.kind === "activity" || row.kind === "admin";
            const subject = isOther
              ? row.label
              : row.kind === "elective"
                ? (electiveChoiceByGroup.get(row.electiveGroupId ?? "")
                    ? `${electiveChoiceByGroup.get(row.electiveGroupId ?? "")!.code} — ${electiveChoiceByGroup.get(row.electiveGroupId ?? "")!.name}`
                    : `${row.electiveLabel} — pick yours in settings`)
                : `${row.code} — ${row.abbrev}`;

            return (
              <li key={row.period} className="flex items-center justify-between rounded border border-gray-200 px-3 py-2">
                <div className="text-sm">
                  <span className="mr-2 text-gray-400">P{row.period}</span>
                  {subject}
                </div>
                <PeriodMarker
                  studentId={student.id}
                  date={date}
                  period={row.period}
                  initialStatus={(statusByPeriod.get(row.period) as "absent" | "od" | undefined) ?? "present"}
                />
              </li>
            );
          })}
        </ul>
      )}

      <DateOverrideControl studentId={student.id} date={date} hasPersonalOverride={!!overrideRow[0]} />

      <p className="mt-6 text-xs text-gray-400">Estimate based on your timetable. Not official.</p>
    </main>
  );
}
