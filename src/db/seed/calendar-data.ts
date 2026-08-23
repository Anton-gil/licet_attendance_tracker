/**
 * Odd 2026 academic calendar seed data — docs/spec.md §7.9.
 *
 * Only the II & III Year track has an official commencement date and
 * printed monthly totals in the spec, so it's the only track seeded with
 * real calendar rows. FY and IV are registered as tracks (so a group can
 * exist and resolve *something*) but carry no calendar rows yet — students
 * in those years fall through to the "borrowed" step of the fallback chain
 * (spec §7.2 step 4) until their own calendar is transcribed.
 *
 * The seven working Saturdays are NOT seeded here. The spec is explicit
 * that they don't appear in the PDF's text layer — they're only visible as
 * the gap between the printed monthly totals and a plain Mon–Fri week, and
 * must be read off the calendar's Saturday shading by eye. Guessing a
 * Saturday's date or day order is worse than leaving it unseeded: §7.3
 * says an unknown-day-order Saturday should be *skipped*, not guessed, so
 * spreading the error evenly is the safe default. Omitting the row here
 * achieves exactly that — the date resolver's fallback chain already
 * treats an unseeded Saturday as non-instruction.
 */

export const ACADEMIC_YEAR = "2026-27";

export const CALENDAR_TRACKS = [
  {
    key: "II-III",
    label: "II & III Year",
    appliesToYears: [2, 3],
    sourceNote: "LICET Odd 2026 academic calendar PDF, p1",
    confidence: "official" as const,
  },
  {
    key: "FY",
    label: "First Year",
    appliesToYears: [1],
    sourceNote: "FY commencement/end dates not yet transcribed from the sheet",
    confidence: "partial" as const,
  },
  {
    key: "IV",
    label: "Fourth Year",
    appliesToYears: [4],
    sourceNote: "IV Year carries its own commencement and unit-completion dates, not yet transcribed",
    confidence: "partial" as const,
  },
];

/**
 * Verify each of these against the official PDF before treating the seed as
 * ship-ready — they were read off a scan (§7.9).
 */
export const HOLIDAYS_ODD_2026: Array<{
  date: string;
  label: string;
  isProvisional: boolean;
}> = [
  { date: "2026-07-31", label: "St Ignatius of Loyola SJ", isProvisional: false },
  { date: "2026-08-15", label: "Independence Day", isProvisional: false },
  { date: "2026-08-26", label: "Milad-un-Nabi", isProvisional: true }, // moon sighting, may shift ±1
  { date: "2026-09-04", label: "Krishna Jayanthi", isProvisional: false },
  { date: "2026-09-14", label: "Vinayakar Chathurthi", isProvisional: false },
  { date: "2026-10-02", label: "Gandhi Jayanthi", isProvisional: false },
  { date: "2026-10-19", label: "Ayutha Pooja", isProvisional: false },
  { date: "2026-10-20", label: "Vijaya Dasami", isProvisional: false },
  { date: "2026-11-08", label: "Deepavali", isProvisional: false }, // falls on a Sunday
  { date: "2026-12-25", label: "Christmas", isProvisional: false },
];

// §7.8 — instruction vs exam-block date ranges, II & III Year track.
export const INSTRUCTION_RANGE = { start: "2026-07-01", end: "2026-10-31" };
export const SEPE_RANGE = { start: "2026-11-02", end: "2026-11-06" };
export const STUDY_HOLIDAY_RANGE = { start: "2026-11-07", end: "2026-11-15" };
export const SEE_RANGE = { start: "2026-11-16", end: "2026-12-31" };
