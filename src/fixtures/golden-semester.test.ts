import { describe, expect, it } from "vitest";
import { buildIIIIICalendarRows } from "@/db/seed/build-calendar-rows";
import { computeAttendance } from "@/lib/attendance/compute";
import type { ResolvedDay } from "@/lib/attendance/types";
import { isoWeekday } from "@/lib/date/ist";
import { GOLDEN_TIMETABLE } from "./golden-timetable";

/**
 * End-to-end integration test: the real calendar seed (§7.9, no working
 * Saturdays — see calendar-data.ts) run through the real §6 date loop
 * against the golden §2 timetable, zero absences, Jul 1 – Oct 31.
 *
 * This is the fixture the v1 smoke-test checklist calls "golden" — if
 * these numbers go red, the date loop is wrong; fix that before anything
 * else. Don't loosen the expected numbers to make this pass.
 *
 * One correction from the checklist as originally written: it expected
 * `per-course sum === 648` (the overall total). That's wrong per spec §3/§5
 * — ABSL and MENTORING count toward overall only and never produce a course
 * entry, so per-course sum must be *less* than overall by exactly the
 * ABSL/MENTORING period count. Asserting equality would mean either double
 * counting Other into some course, or silently dropping the invariant that
 * Other has no course percentage. The correct identity is
 * `overall === per-course sum + Other`, asserted below.
 */
describe("golden semester fixture — calendar seed × golden timetable, zero absences (Jul 1 – Oct 31)", () => {
  const rows = buildIIIIICalendarRows();
  const instructionDates = rows.filter((r) => r.kind === "instruction" && r.date <= "2026-10-31").map((r) => r.date);

  const days: ResolvedDay[] = instructionDates.map((date) => {
    const dow = isoWeekday(date);
    const slots = GOLDEN_TIMETABLE.filter((s) => s.day === dow).map((s) => ({ period: s.period, courseCode: s.code }));
    return { date, slots, confidence: "official" as const };
  });

  const result = computeAttendance(days, () => null, { includeOdAsPresent: true });

  it("has exactly 81 instruction days — the seed deliberately omits the 7 unseeded working Saturdays", () => {
    expect(instructionDates).toHaveLength(81);
  });

  it("weekday distribution matches spec §20's own worked example exactly (Mon 15, Tue 16, Wed 17, Thu 18, Fri 15)", () => {
    const counts: Record<number, number> = {};
    for (const date of instructionDates) counts[isoWeekday(date)] = (counts[isoWeekday(date)] ?? 0) + 1;
    expect(counts).toEqual({ 1: 15, 2: 16, 3: 17, 4: 18, 5: 15 });
  });

  it("overall conducted is 81 days × 8 periods = 648", () => {
    expect(result.overall.conducted).toBe(648);
  });

  it("a zero-absence student is at exactly 100% overall and per course", () => {
    expect(result.overall.percentage).toBe(100);
    expect(result.courses.CS24512.percentage).toBe(100);
  });

  it("low-frequency FC24501 (UHVSL, Monday only) conducts exactly 15 periods all semester (spec §20)", () => {
    expect(result.courses.FC24501.conducted).toBe(15);
  });

  it("CS24512 (theory+lab merged under one code) conducts exactly 96 periods", () => {
    expect(result.courses.CS24512.conducted).toBe(96);
  });

  it("AD24412 (theory+lab merged under one code) conducts exactly 99 periods", () => {
    expect(result.courses.AD24412.conducted).toBe(99);
  });

  it("overall === per-course sum + Other (ABSL/MENTORING), never per-course sum alone (spec §3)", () => {
    const perCourseSum = Object.values(result.courses).reduce((a, c) => a + c.conducted, 0);
    const other = result.overall.conducted - perCourseSum;
    expect(perCourseSum).toBe(599);
    expect(other).toBe(49); // 15 Mondays × 1 (ABSL) + 17 Wednesdays × 2 (ABSL + MENTORING)
    expect(perCourseSum + other).toBe(result.overall.conducted);
  });
});
