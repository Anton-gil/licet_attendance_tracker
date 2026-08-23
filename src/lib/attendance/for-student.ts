import { and, count, eq, gte, inArray, lte } from "drizzle-orm";
import "server-only";
import { db } from "@/db";
import {
  academicCalendar,
  academicGroup,
  attendanceException,
  calendarOverride,
  calendarTrack,
  course,
  courseVariant,
  groupMembership,
  overrideConfirmation,
  studentElectiveChoice,
  timetableEntry,
} from "@/db/schema";
import { SEE_RANGE } from "@/db/seed/calendar-data";
import type { CurrentStudent } from "@/lib/auth/require-student";
import { addDays, todayIST } from "@/lib/date/ist";
import type { CalendarEntry, OverrideEntry } from "@/lib/date/types";
import { computeAttendance } from "./compute";
import type { Bundle, Membership } from "./resolve-days";
import { hasUncertainConfidence, resolveDaysInRange } from "./resolve-days";
import type { AttendanceResult, ExceptionStatus } from "./types";

const GROUP_OVERRIDE_CONFIRMATIONS_REQUIRED = 2;

export type PeriodTally = { overall: number; perCourse: Record<string, number> };

export type StudentDashboardData = {
  /** Attendance from the semester start through `asOf`, inclusive. */
  attendance: AttendanceResult;
  /** Periods still to come, from the day after `asOf` through semester end — feeds the recovery calculator (spec §7.8/§11: never remaining calendar days). */
  remaining: PeriodTally;
  asOf: string;
  semesterStart: string;
  /** True if any day counted so far came from the borrowed/inferred/guessed rungs of the fallback chain — drives the "working days assumed" disclaimer (spec §10). */
  calendarConfidenceIsUncertain: boolean;
};

/**
 * Everything the dashboard needs, in one bulk-loaded pass instead of a
 * per-date round trip: the §6 date loop for days already past (with
 * exceptions applied) and for days still to come (a plain period tally,
 * no exceptions — nothing has happened there yet). Group is resolved per
 * date from `group_membership` validity ranges, never "the student's
 * current group" (invariant 6); electives resolve to this student's
 * actual choice; every date runs the full resolver fallback chain.
 */
export async function getStudentDashboardData(
  student: CurrentStudent,
  asOf: string = todayIST(),
): Promise<StudentDashboardData> {
  const memberships = await db.select().from(groupMembership).where(eq(groupMembership.studentId, student.id));

  const semesterStart = student.semesterStartDate ?? memberships[0]?.validFrom ?? asOf;
  // §20: as_of must clamp to the semester end, or a student opening the
  // app after instruction ends sees a denominator that keeps growing.
  const clampedAsOf = asOf < SEE_RANGE.end ? asOf : SEE_RANGE.end;

  if (memberships.length === 0) {
    return {
      attendance: computeAttendance([], () => null, { includeOdAsPresent: student.includeOdAsPresent }),
      remaining: { overall: 0, perCourse: {} },
      asOf: clampedAsOf,
      semesterStart,
      calendarConfidenceIsUncertain: false,
    };
  }

  const bundle = await loadBundle(student, memberships, semesterStart, SEE_RANGE.end);

  const pastDays = resolveDaysInRange(bundle, semesterStart, clampedAsOf);
  const futureStart = addDays(clampedAsOf, 1);
  const futureDays = futureStart <= SEE_RANGE.end ? resolveDaysInRange(bundle, futureStart, SEE_RANGE.end) : [];

  const exceptionRows = await db
    .select()
    .from(attendanceException)
    .where(
      and(
        eq(attendanceException.studentId, student.id),
        gte(attendanceException.date, semesterStart),
        lte(attendanceException.date, clampedAsOf),
      ),
    );
  const exceptionsByKey = new Map<string, ExceptionStatus>(
    exceptionRows.map((r) => [`${r.date}:${r.period}`, r.status]),
  );

  const attendance = computeAttendance(
    pastDays,
    (date, period) => exceptionsByKey.get(`${date}:${period}`) ?? null,
    { includeOdAsPresent: student.includeOdAsPresent },
  );

  const remaining: PeriodTally = { overall: 0, perCourse: {} };
  for (const day of futureDays) {
    for (const slot of day.slots) {
      remaining.overall += 1;
      if (slot.courseCode) {
        remaining.perCourse[slot.courseCode] = (remaining.perCourse[slot.courseCode] ?? 0) + 1;
      }
    }
  }

  return {
    attendance,
    remaining,
    asOf: clampedAsOf,
    semesterStart,
    calendarConfidenceIsUncertain: hasUncertainConfidence(pastDays),
  };
}

// ---------------------------------------------------------------------------
// Bulk data loading — one round trip per table, covering the whole range,
// so resolveDaysInRange below never hits the DB.
// ---------------------------------------------------------------------------

async function loadBundle(
  student: CurrentStudent,
  memberships: Membership[],
  fromDate: string,
  toDate: string,
): Promise<Bundle> {
  const groupIds = [...new Set(memberships.map((m) => m.groupId))];
  const groups = await db.select().from(academicGroup).where(inArray(academicGroup.id, groupIds));
  const groupsById = new Map(groups.map((g) => [g.id, g]));
  const academicYears = [...new Set(groups.map((g) => g.academicYear))];

  const tracks = academicYears.length
    ? await db.select().from(calendarTrack).where(inArray(calendarTrack.academicYear, academicYears))
    : [];
  const trackKeyByYear = new Map<string, string>();
  for (const t of tracks) {
    for (const y of t.appliesToYears) trackKeyByYear.set(`${t.academicYear}:${y}`, t.key);
  }

  const calendarRows = academicYears.length
    ? await db
        .select()
        .from(academicCalendar)
        .where(
          and(
            inArray(academicCalendar.academicYear, academicYears),
            gte(academicCalendar.date, fromDate),
            lte(academicCalendar.date, toDate),
          ),
        )
    : [];
  const calendarByTrack = new Map<string, Map<string, CalendarEntry>>();
  for (const row of calendarRows) {
    let byDate = calendarByTrack.get(row.track);
    if (!byDate) {
      byDate = new Map();
      calendarByTrack.set(row.track, byDate);
    }
    byDate.set(row.date, { kind: row.kind, dayOrder: row.dayOrder, label: row.label });
  }

  const personalOverrideRows = await db
    .select()
    .from(calendarOverride)
    .where(
      and(
        eq(calendarOverride.scope, "student"),
        eq(calendarOverride.studentId, student.id),
        gte(calendarOverride.date, fromDate),
        lte(calendarOverride.date, toDate),
      ),
    );
  const personalOverrides = new Map<string, OverrideEntry>(
    personalOverrideRows.map((r) => [r.date, { kind: r.kind, dayOrder: r.dayOrder }]),
  );

  const groupOverrideRows = await db
    .select({
      groupId: calendarOverride.groupId,
      date: calendarOverride.date,
      kind: calendarOverride.kind,
      dayOrder: calendarOverride.dayOrder,
      confirmations: count(overrideConfirmation.studentId),
    })
    .from(calendarOverride)
    .leftJoin(overrideConfirmation, eq(overrideConfirmation.overrideId, calendarOverride.id))
    .where(
      and(
        eq(calendarOverride.scope, "group"),
        inArray(calendarOverride.groupId, groupIds),
        gte(calendarOverride.date, fromDate),
        lte(calendarOverride.date, toDate),
      ),
    )
    .groupBy(calendarOverride.id, calendarOverride.groupId, calendarOverride.date, calendarOverride.kind, calendarOverride.dayOrder);

  const confirmedGroupOverridesByGroup = new Map<string, Map<string, OverrideEntry>>();
  for (const row of groupOverrideRows) {
    if (row.confirmations < GROUP_OVERRIDE_CONFIRMATIONS_REQUIRED || !row.groupId) continue;
    let byDate = confirmedGroupOverridesByGroup.get(row.groupId);
    if (!byDate) {
      byDate = new Map();
      confirmedGroupOverridesByGroup.set(row.groupId, byDate);
    }
    byDate.set(row.date, { kind: row.kind, dayOrder: row.dayOrder });
  }

  const timetableRows = await db
    .select({
      groupId: timetableEntry.groupId,
      dayOfWeek: timetableEntry.dayOfWeek,
      period: timetableEntry.period,
      kind: timetableEntry.kind,
      electiveGroupId: timetableEntry.electiveGroupId,
      courseCode: course.code,
    })
    .from(timetableEntry)
    .leftJoin(courseVariant, eq(courseVariant.id, timetableEntry.courseVariantId))
    .leftJoin(course, eq(course.id, courseVariant.courseId))
    .where(inArray(timetableEntry.groupId, groupIds));

  const timetableByGroupDow: Bundle["timetableByGroupDow"] = new Map();
  for (const row of timetableRows) {
    const key = `${row.groupId}:${row.dayOfWeek}`;
    const list = timetableByGroupDow.get(key) ?? [];
    list.push({ period: row.period, kind: row.kind, electiveGroupId: row.electiveGroupId, courseCode: row.courseCode });
    timetableByGroupDow.set(key, list);
  }

  const electiveChoiceRows = await db
    .select({ electiveGroupId: studentElectiveChoice.electiveGroupId, code: course.code })
    .from(studentElectiveChoice)
    .innerJoin(course, eq(course.id, studentElectiveChoice.courseId))
    .where(eq(studentElectiveChoice.studentId, student.id));
  const electiveChoiceCode = new Map(electiveChoiceRows.map((r) => [r.electiveGroupId, r.code]));

  return {
    memberships,
    groupsById,
    trackKeyByYear,
    calendarByTrack,
    personalOverrides,
    confirmedGroupOverridesByGroup,
    timetableByGroupDow,
    electiveChoiceCode,
    countActivitySlots: student.countActivitySlots,
  };
}
