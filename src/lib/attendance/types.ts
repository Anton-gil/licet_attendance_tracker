/** A timetable slot already resolved for one specific instruction date — electives resolved to the student's actual choice, kind collapsed to whether it has a course code or not (spec §3: activity/admin count overall only). */
export type ResolvedSlot = {
  period: number;
  /** null for ABSL/MENTORING-style slots — counts toward overall only, never a course percentage (§3). */
  courseCode: string | null;
};

/** One instruction date with its slots already resolved via the date resolver + group-at-that-date's timetable (§6 loop). Non-instruction dates are never passed in — the caller filters them out via resolveDate. */
export type ResolvedDay = {
  date: string;
  slots: ResolvedSlot[];
};

export type ExceptionStatus = "absent" | "od";

/** Looks up a single (date, period) exception. Called from inside the loop, never counted independently and subtracted (CLAUDE.md invariant 3). */
export type ExceptionLookup = (date: string, period: number) => ExceptionStatus | null;

export type PeriodStats = {
  conducted: number;
  absent: number;
  od: number;
  /** Present, after applying the OD toggle (spec §19.2). */
  present: number;
  /** null when conducted === 0 — no periods yet, not "0%". */
  percentage: number | null;
};

export type AttendanceResult = {
  overall: PeriodStats;
  /** Keyed by course code — ABSL/MENTORING never appear here (spec §3). */
  courses: Record<string, PeriodStats>;
};
