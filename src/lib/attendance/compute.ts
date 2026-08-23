import type { AttendanceResult, ExceptionLookup, PeriodStats, ResolvedDay } from "./types";

class Accumulator {
  conducted = 0;
  absent = 0;
  od = 0;

  record(status: "present" | "absent" | "od") {
    this.conducted += 1;
    if (status === "absent") this.absent += 1;
    else if (status === "od") this.od += 1;
  }

  finish(includeOdAsPresent: boolean): PeriodStats {
    // OD resolution (spec §19.2, resolved) — exactly two states, never a
    // third "excluded from denominator" convention.
    const present = this.conducted - this.absent - (includeOdAsPresent ? 0 : this.od);
    return {
      conducted: this.conducted,
      absent: this.absent,
      od: this.od,
      present,
      percentage: this.conducted === 0 ? null : (present / this.conducted) * 100,
    };
  }
}

/**
 * The date loop, spec §6: walks pre-resolved instruction days (the caller
 * has already run every date through the date resolver and expanded the
 * group-at-that-date's timetable with electives resolved), looks up each
 * period's exception from inside the loop, and accumulates. Present is
 * never stored — it's simply "no exception found" (invariant 1).
 *
 * Overall attendance is total-periods based (`sum(present)/sum(conducted)`
 * across everything, including activity/admin slots) per the resolved
 * decision in CLAUDE.md — not a mean of per-course percentages.
 */
export function computeAttendance(
  days: ResolvedDay[],
  getException: ExceptionLookup,
  options: { includeOdAsPresent: boolean },
): AttendanceResult {
  const overall = new Accumulator();
  const courseAccumulators = new Map<string, Accumulator>();

  for (const day of days) {
    for (const slot of day.slots) {
      const exception = getException(day.date, slot.period);
      const status = exception ?? "present";

      overall.record(status);

      if (slot.courseCode) {
        let acc = courseAccumulators.get(slot.courseCode);
        if (!acc) {
          acc = new Accumulator();
          courseAccumulators.set(slot.courseCode, acc);
        }
        acc.record(status);
      }
    }
  }

  const courses: Record<string, PeriodStats> = {};
  for (const [code, acc] of courseAccumulators) {
    courses[code] = acc.finish(options.includeOdAsPresent);
  }

  return { overall: overall.finish(options.includeOdAsPresent), courses };
}
