import { describe, expect, it } from "vitest";
import { computeAttendance } from "./compute";
import type { ExceptionStatus, ResolvedDay } from "./types";

const DAYS: ResolvedDay[] = [
  {
    date: "2026-08-24",
    slots: [
      { period: 1, courseCode: "AD24501" },
      { period: 2, courseCode: null }, // ABSL
    ],
  },
  {
    date: "2026-08-25",
    slots: [
      { period: 1, courseCode: "AD24501" },
      { period: 2, courseCode: null }, // MENTORING
    ],
  },
];

const exceptions: Record<string, ExceptionStatus> = {
  "2026-08-24:1": "absent",
  "2026-08-25:2": "od",
};

function getException(date: string, period: number): ExceptionStatus | null {
  return exceptions[`${date}:${period}`] ?? null;
}

describe("computeAttendance (spec §6)", () => {
  it("present is never stored — an unmarked period is present by omission (invariant 1)", () => {
    const result = computeAttendance(DAYS, getException, { includeOdAsPresent: true });
    // 4 total periods, 1 absent, 1 od, so 2 are present purely because no exception exists.
    expect(result.overall.conducted).toBe(4);
  });

  it("OD toggle ON (default): OD counts as present", () => {
    const result = computeAttendance(DAYS, getException, { includeOdAsPresent: true });
    expect(result.overall).toMatchObject({ conducted: 4, absent: 1, od: 1, present: 3, percentage: 75 });
  });

  it("OD toggle OFF: OD counts as absent", () => {
    const result = computeAttendance(DAYS, getException, { includeOdAsPresent: false });
    expect(result.overall).toMatchObject({ conducted: 4, absent: 1, od: 1, present: 2, percentage: 50 });
  });

  it("activity/admin slots (courseCode null) count toward overall but produce no course entry (spec §3)", () => {
    const result = computeAttendance(DAYS, getException, { includeOdAsPresent: true });
    expect(Object.keys(result.courses)).toEqual(["AD24501"]);
    expect(result.courses.AD24501).toMatchObject({ conducted: 2, absent: 1, present: 1, percentage: 50 });
  });

  it("a course with zero conducted periods has a null percentage, not 0%", () => {
    const result = computeAttendance([], getException, { includeOdAsPresent: true });
    expect(result.overall.percentage).toBeNull();
  });

  it("a zero-absence student shows exactly 100% (pre-launch checklist, spec §18)", () => {
    const days: ResolvedDay[] = [{ date: "2026-08-24", slots: [{ period: 1, courseCode: "CS24512" }] }];
    const result = computeAttendance(days, () => null, { includeOdAsPresent: true });
    expect(result.overall.percentage).toBe(100);
    expect(result.courses.CS24512.percentage).toBe(100);
  });
});
