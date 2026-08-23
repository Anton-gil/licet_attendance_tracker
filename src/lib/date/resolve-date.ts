import { and, count, eq, gte, isNull, lte, or, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  academicCalendar,
  academicGroup,
  calendarOverride,
  calendarTrack,
  groupMembership,
  overrideConfirmation,
} from "@/db/schema";
import { ACADEMIC_YEAR, HOLIDAYS_ODD_2026 } from "@/db/seed/calendar-data";
import { resolveDateCore } from "./resolve-date-core";
import type { CalendarEntry, DateResolution, OverrideEntry } from "./types";

// Group overrides need two confirmations beyond the proposer (spec §7.5).
const GROUP_OVERRIDE_CONFIRMATIONS_REQUIRED = 2;

// Fallback-chain step 5's "general LICET holiday list" (spec §7.2/§7.3) —
// college-wide, track-independent. There's one seeded holiday list per
// academic year today; swap this for a real table if a second year's
// holidays need to coexist.
const GENERAL_HOLIDAYS = new Set(HOLIDAYS_ODD_2026.map((h) => h.date));

/**
 * `resolveDate(date, student) → { isInstruction, effectiveDow, confidence }`
 * — CLAUDE.md invariant 5. Every screen that needs to know whether class
 * ran on a date, and under which weekday's timetable, calls this. It
 * assembles a ResolverContext from the DB for just this one date and hands
 * off to the pure resolveDateCore for the actual fallback-chain logic.
 *
 * No caching yet — §6 calls for memoizing this per (student, as-of date,
 * override version) once it's on the hot path of a real page; wire that in
 * with the first caller rather than speculatively here.
 */
export async function resolveDate(date: string, studentId: string): Promise<DateResolution> {
  const membership = await db
    .select({
      groupId: groupMembership.groupId,
      year: academicGroup.year,
      academicYear: academicGroup.academicYear,
    })
    .from(groupMembership)
    .innerJoin(academicGroup, eq(academicGroup.id, groupMembership.groupId))
    .where(
      and(
        eq(groupMembership.studentId, studentId),
        lte(groupMembership.validFrom, date),
        or(isNull(groupMembership.validTo), gte(groupMembership.validTo, date)),
      ),
    )
    .limit(1);

  const academicYear = membership[0]?.academicYear ?? ACADEMIC_YEAR;
  const groupId = membership[0]?.groupId ?? null;
  const studentYear = membership[0]?.year ?? null;

  const studentTrack = await resolveTrackKey(academicYear, studentYear);

  const personalOverrideRow = await db
    .select({ kind: calendarOverride.kind, dayOrder: calendarOverride.dayOrder })
    .from(calendarOverride)
    .where(
      and(
        eq(calendarOverride.scope, "student"),
        eq(calendarOverride.studentId, studentId),
        eq(calendarOverride.date, date),
      ),
    )
    .limit(1);

  const personalOverrides = new Map<string, OverrideEntry>();
  if (personalOverrideRow[0]) {
    personalOverrides.set(date, personalOverrideRow[0]);
  }

  const confirmedGroupOverrides = new Map<string, OverrideEntry>();
  if (groupId) {
    const groupOverrideRows = await db
      .select({
        kind: calendarOverride.kind,
        dayOrder: calendarOverride.dayOrder,
        confirmations: count(overrideConfirmation.studentId),
      })
      .from(calendarOverride)
      .leftJoin(overrideConfirmation, eq(overrideConfirmation.overrideId, calendarOverride.id))
      .where(
        and(
          eq(calendarOverride.scope, "group"),
          eq(calendarOverride.groupId, groupId),
          eq(calendarOverride.date, date),
        ),
      )
      .groupBy(calendarOverride.id, calendarOverride.kind, calendarOverride.dayOrder)
      .limit(1);

    const row = groupOverrideRows[0];
    if (row && row.confirmations >= GROUP_OVERRIDE_CONFIRMATIONS_REQUIRED) {
      confirmedGroupOverrides.set(date, { kind: row.kind, dayOrder: row.dayOrder });
    }
  }

  const calendarRows = await db
    .select({
      track: academicCalendar.track,
      kind: academicCalendar.kind,
      dayOrder: academicCalendar.dayOrder,
      label: academicCalendar.label,
    })
    .from(academicCalendar)
    .where(and(eq(academicCalendar.academicYear, academicYear), eq(academicCalendar.date, date)));

  const calendarByTrack = new Map<string, Map<string, CalendarEntry>>();
  for (const row of calendarRows) {
    calendarByTrack.set(
      row.track,
      new Map([[date, { kind: row.kind, dayOrder: row.dayOrder, label: row.label }]]),
    );
  }

  return resolveDateCore(date, {
    studentTrack,
    personalOverrides,
    confirmedGroupOverrides,
    calendarByTrack,
    generalHolidays: GENERAL_HOLIDAYS,
  });
}

async function resolveTrackKey(academicYear: string, studentYear: number | null): Promise<string | null> {
  if (studentYear === null) return null;
  const rows = await db
    .select({ key: calendarTrack.key })
    .from(calendarTrack)
    .where(
      and(
        eq(calendarTrack.academicYear, academicYear),
        sql`${studentYear} = any(${calendarTrack.appliesToYears})`,
      ),
    )
    .limit(1);
  return rows[0]?.key ?? null;
}
