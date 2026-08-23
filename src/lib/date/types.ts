/** Confidence levels of the fallback chain in docs/spec.md §7.2, in resolution order. */
export type DateConfidence = "exact" | "official" | "borrowed" | "inferred" | "guessed";

export type DateResolutionSource =
  | "personal_override"
  | "group_override"
  | "calendar"
  | "borrowed_calendar"
  | "general_holiday_fallback"
  | "weekday_fallback";

/**
 * The one shape every consumer of the date resolver works with — day view,
 * the attendance denominator loop, the simulator, notifications. Nothing
 * outside resolve-date-core.ts should call `isoWeekday` directly and build
 * this by hand (CLAUDE.md invariant 5).
 */
export type DateResolution = {
  date: string;
  isInstruction: boolean;
  /** 1 (Mon) .. 7 (Sun) timetable to run today; null when not an instruction day. */
  effectiveDow: number | null;
  confidence: DateConfidence;
  source: DateResolutionSource;
  label: string | null;
};

/** A personal or confirmed-group override for one date. Kind is intentionally narrower than the full calendar kind (spec §7.6: a student only ever flips a date between working and holiday). */
export type OverrideEntry = {
  kind: "instruction" | "holiday";
  dayOrder: number | null;
};

export type CalendarKind = "instruction" | "holiday" | "sepe" | "see" | "study_holiday" | "vacation";

export type CalendarEntry = {
  kind: CalendarKind;
  dayOrder: number | null;
  label: string | null;
};

/**
 * Everything resolveDateCore needs for one student, pre-loaded and
 * DB-free — assembled once per (student, as-of window) by the DB-backed
 * loader in resolve-date.ts so the core logic stays pure and unit-testable.
 */
export type ResolverContext = {
  /** The track key this student's group resolves to for the date's academic year, or null if unknown/unseeded. */
  studentTrack: string | null;
  personalOverrides: Map<string, OverrideEntry>;
  confirmedGroupOverrides: Map<string, OverrideEntry>;
  /** track key -> date -> entry. Includes the student's own track (if any) plus any others to borrow from. */
  calendarByTrack: Map<string, Map<string, CalendarEntry>>;
  /** LICET-wide holiday list, track-independent — fallback chain step 5/6 (spec §7.2). */
  generalHolidays: Set<string>;
};
