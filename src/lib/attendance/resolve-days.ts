import { HOLIDAYS_ODD_2026 } from "@/db/seed/calendar-data";
import type { academicGroup, groupMembership } from "@/db/schema";
import { dateRange } from "@/lib/date/ist";
import { resolveDateCore } from "@/lib/date/resolve-date-core";
import type { CalendarEntry, OverrideEntry, ResolverContext } from "@/lib/date/types";
import type { ResolvedDay } from "./types";

const GENERAL_HOLIDAYS = new Set(HOLIDAYS_ODD_2026.map((h) => h.date));

export type Membership = typeof groupMembership.$inferSelect;

export type Bundle = {
  memberships: Membership[];
  groupsById: Map<string, typeof academicGroup.$inferSelect>;
  trackKeyByYear: Map<string, string>; // `${academicYear}:${year}` -> track key
  calendarByTrack: Map<string, Map<string, CalendarEntry>>;
  personalOverrides: Map<string, OverrideEntry>;
  confirmedGroupOverridesByGroup: Map<string, Map<string, OverrideEntry>>;
  timetableByGroupDow: Map<string, { period: number; kind: string; electiveGroupId: string | null; courseCode: string | null }[]>;
  electiveChoiceCode: Map<string, string>;
  countActivitySlots: boolean;
};

/**
 * Which membership covers this date — invariant 6 ("group is resolved per
 * date, from group_membership validity ranges, not from the student's
 * current group"). A section transfer mid-semester means July–August must
 * resolve against the old group's timetable even though `validTo` has
 * since been set; this is the one place that decision gets made, so every
 * caller (the date loop here, and anything built later) goes through it
 * instead of reaching for "the student's current group" directly.
 */
export function findMembershipForDate(memberships: Membership[], date: string): Membership | undefined {
  return memberships.find((m) => m.validFrom <= date && (!m.validTo || m.validTo >= date));
}

/**
 * Pure (no DB access) — walks dates and resolves each into slots, entirely
 * from a pre-loaded bundle. Kept separate from the DB loader in
 * for-student.ts so it can be unit tested with a hand-built bundle instead
 * of a real database.
 */
export function resolveDaysInRange(bundle: Bundle, fromDate: string, toDate: string): ResolvedDay[] {
  const days: ResolvedDay[] = [];

  for (const date of dateRange(fromDate, toDate)) {
    const membership = findMembershipForDate(bundle.memberships, date);
    if (!membership) continue;

    const group = bundle.groupsById.get(membership.groupId);
    if (!group) continue;

    const studentTrack = bundle.trackKeyByYear.get(`${group.academicYear}:${group.year}`) ?? null;

    const context: ResolverContext = {
      studentTrack,
      personalOverrides: bundle.personalOverrides,
      confirmedGroupOverrides: bundle.confirmedGroupOverridesByGroup.get(group.id) ?? new Map(),
      calendarByTrack: bundle.calendarByTrack,
      generalHolidays: GENERAL_HOLIDAYS,
    };

    const resolution = resolveDateCore(date, context);
    if (!resolution.isInstruction || resolution.effectiveDow === null) continue;

    const entries = bundle.timetableByGroupDow.get(`${group.id}:${resolution.effectiveDow}`) ?? [];
    const slots = entries
      .filter((e) => bundle.countActivitySlots || e.kind === "course" || e.kind === "elective")
      .map((e) => ({
        period: e.period,
        courseCode:
          e.kind === "course"
            ? e.courseCode
            : e.kind === "elective" && e.electiveGroupId
              ? (bundle.electiveChoiceCode.get(e.electiveGroupId) ?? null)
              : null,
      }));

    days.push({ date, slots });
  }

  return days;
}
