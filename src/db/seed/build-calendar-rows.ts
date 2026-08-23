import { dateRange, isBetween, isoWeekday } from "@/lib/date/ist";
import {
  ACADEMIC_YEAR,
  HOLIDAYS_ODD_2026,
  INSTRUCTION_RANGE,
  SEE_RANGE,
  SEPE_RANGE,
  STUDY_HOLIDAY_RANGE,
} from "./calendar-data";

export type CalendarKind =
  | "instruction"
  | "holiday"
  | "sepe"
  | "see"
  | "study_holiday"
  | "vacation";

export type CalendarRow = {
  academicYear: string;
  track: string;
  date: string;
  kind: CalendarKind;
  dayOrder: number | null;
  label: string | null;
  isProvisional: boolean;
};

const HOLIDAY_BY_DATE = new Map(HOLIDAYS_ODD_2026.map((h) => [h.date, h]));

/**
 * Pure classification of a single calendar date for the II & III Year
 * track — no DB access, so both the seed script and the build-time
 * assertion can share it. Returns `null` for dates the seed intentionally
 * leaves unclaimed (plain Saturdays/Sundays with no known holiday, or
 * anything outside the ranges transcribed from the sheet) — those fall
 * through to the date resolver's runtime fallback chain instead.
 */
export function classifyDate(date: string): Omit<CalendarRow, "academicYear" | "track"> | null {
  const holiday = HOLIDAY_BY_DATE.get(date);
  if (holiday) {
    return { date, kind: "holiday", dayOrder: null, label: holiday.label, isProvisional: holiday.isProvisional };
  }

  const dow = isoWeekday(date);
  if (dow === 6 || dow === 7) {
    // Unseeded Saturday/Sunday — see the module doc in calendar-data.ts.
    return null;
  }

  if (isBetween(date, SEPE_RANGE.start, SEPE_RANGE.end)) {
    return { date, kind: "sepe", dayOrder: null, label: null, isProvisional: false };
  }
  if (isBetween(date, STUDY_HOLIDAY_RANGE.start, STUDY_HOLIDAY_RANGE.end)) {
    return { date, kind: "study_holiday", dayOrder: null, label: null, isProvisional: false };
  }
  if (isBetween(date, SEE_RANGE.start, SEE_RANGE.end)) {
    return { date, kind: "see", dayOrder: null, label: null, isProvisional: false };
  }
  if (isBetween(date, INSTRUCTION_RANGE.start, INSTRUCTION_RANGE.end)) {
    return { date, kind: "instruction", dayOrder: null, label: null, isProvisional: false };
  }

  return null;
}

/** Every seedable row for the II & III Year track, instruction start through SEE range end. */
export function buildIIIIICalendarRows(): CalendarRow[] {
  const rows: CalendarRow[] = [];
  for (const date of dateRange(INSTRUCTION_RANGE.start, SEE_RANGE.end)) {
    const classified = classifyDate(date);
    if (classified) {
      rows.push({ academicYear: ACADEMIC_YEAR, track: "II-III", ...classified });
    }
  }
  return rows;
}
