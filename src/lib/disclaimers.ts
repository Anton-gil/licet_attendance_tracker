/**
 * Exact copy from spec §10 — kept in one place so "does it render, verbatim,
 * everywhere it's supposed to" is a grep-able question instead of a
 * find-every-page-and-eyeball-it one.
 */

export const DASHBOARD_DISCLAIMER = "Estimate based on your timetable. Not official.";

/** Shown under a percentage when the date resolver fell back to borrowed/inferred/guessed for any day in the range — never for exact (override) or official. */
export const CONFIDENCE_DISCLAIMER = "Working days assumed from the academic calendar — your year's may differ.";

/** Onboarding + recovery calculator — the full version. */
export const FULL_DISCLAIMER =
  "These numbers are estimated from your class timetable and the published academic calendar. Working days, holidays and exam dates are assumed and may have changed — and substitutions or cancelled classes aren't tracked, so your official attendance will differ. Treat this as a rough picture, and check the college portal for the real number.";

export const FOOTER_DISCLAIMER = "built by a student, not affiliated with or endorsed by LICET";
