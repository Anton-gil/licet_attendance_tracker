import { isoWeekday } from "./ist";
import type { CalendarEntry, DateResolution, OverrideEntry, ResolverContext } from "./types";

/**
 * The fallback chain, docs/spec.md §7.2 — stops at the first hit:
 *
 *   1. personal override                  → confidence: exact
 *   2. confirmed group override            → confidence: exact
 *   3. official calendar for this track    → confidence: official
 *   4. official calendar for any track     → confidence: borrowed
 *      in the same academic year
 *   5. Mon–Fri, minus the general LICET    → confidence: inferred
 *      holiday list
 *   6. Mon–Fri                             → confidence: guessed
 *
 * Nothing in this chain throws or returns null — degrade, never block
 * (CLAUDE.md invariant 8). This is the only function in the codebase
 * allowed to call `isoWeekday` (invariant 5); every other consumer calls
 * this function instead.
 */
export function resolveDateCore(date: string, ctx: ResolverContext): DateResolution {
  const personal = ctx.personalOverrides.get(date);
  if (personal) {
    return fromOverride(date, personal, "exact", "personal_override");
  }

  const group = ctx.confirmedGroupOverrides.get(date);
  if (group) {
    return fromOverride(date, group, "exact", "group_override");
  }

  if (ctx.studentTrack) {
    const ownEntry = ctx.calendarByTrack.get(ctx.studentTrack)?.get(date);
    if (ownEntry) {
      return fromCalendar(date, ownEntry, "official", "calendar");
    }
  }

  for (const [track, byDate] of ctx.calendarByTrack) {
    if (track === ctx.studentTrack) continue;
    const entry = byDate.get(date);
    if (entry) {
      return fromCalendar(date, entry, "borrowed", "borrowed_calendar");
    }
  }

  const dow = isoWeekday(date);
  const isWeekday = dow >= 1 && dow <= 5;
  const haveGeneralHolidayData = ctx.generalHolidays.size > 0;
  const confidence = haveGeneralHolidayData ? "inferred" : "guessed";
  const source = haveGeneralHolidayData ? "general_holiday_fallback" : "weekday_fallback";

  if (isWeekday && !ctx.generalHolidays.has(date)) {
    return { date, isInstruction: true, effectiveDow: dow, confidence, source, label: null };
  }
  return { date, isInstruction: false, effectiveDow: null, confidence, source, label: null };
}

function fromOverride(
  date: string,
  entry: OverrideEntry,
  confidence: DateResolution["confidence"],
  source: DateResolution["source"],
): DateResolution {
  if (entry.kind === "holiday") {
    return { date, isInstruction: false, effectiveDow: null, confidence, source, label: null };
  }
  return {
    date,
    isInstruction: true,
    effectiveDow: entry.dayOrder ?? isoWeekday(date),
    confidence,
    source,
    label: null,
  };
}

function fromCalendar(
  date: string,
  entry: CalendarEntry,
  confidence: DateResolution["confidence"],
  source: DateResolution["source"],
): DateResolution {
  // Only 'instruction' enters the denominator — sepe/see/study_holiday/
  // vacation/holiday are all non-instruction (spec §7.8).
  const isInstruction = entry.kind === "instruction";
  return {
    date,
    isInstruction,
    effectiveDow: isInstruction ? entry.dayOrder ?? isoWeekday(date) : null,
    confidence,
    source,
    label: entry.label,
  };
}
