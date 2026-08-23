import { describe, expect, it } from "vitest";
import { findMembershipForDate, resolveDaysInRange, type Bundle, type Membership } from "./resolve-days";

function membership(groupId: string, validFrom: string, validTo: string | null): Membership {
  return { id: `m-${groupId}`, studentId: "s1", groupId, validFrom, validTo } as Membership;
}

function emptyBundle(overrides: Partial<Bundle> = {}): Bundle {
  return {
    memberships: [],
    groupsById: new Map(),
    trackKeyByYear: new Map(),
    calendarByTrack: new Map(),
    personalOverrides: new Map(),
    confirmedGroupOverridesByGroup: new Map(),
    timetableByGroupDow: new Map(),
    electiveChoiceCode: new Map(),
    countActivitySlots: true,
    ...overrides,
  };
}

describe("findMembershipForDate (spec §6/§20: group resolved per date, never 'current group')", () => {
  const memberships = [membership("A", "2026-07-01", "2026-08-31"), membership("B", "2026-09-01", null)];

  it("resolves to the old group for a date inside its validity range, even though the student has since moved on", () => {
    expect(findMembershipForDate(memberships, "2026-07-15")?.groupId).toBe("A");
    expect(findMembershipForDate(memberships, "2026-08-31")?.groupId).toBe("A");
  });

  it("resolves to the new group once its range starts", () => {
    expect(findMembershipForDate(memberships, "2026-09-01")?.groupId).toBe("B");
    expect(findMembershipForDate(memberships, "2026-12-01")?.groupId).toBe("B");
  });

  it("resolves to nothing for a date before any membership starts", () => {
    expect(findMembershipForDate(memberships, "2026-06-15")).toBeUndefined();
  });
});

describe("resolveDaysInRange uses the membership-at-that-date's timetable, not the current one (spec §6/§20)", () => {
  it("July resolves against group A's timetable; September resolves against group B's", () => {
    const bundle = emptyBundle({
      memberships: [membership("A", "2026-07-01", "2026-08-31"), membership("B", "2026-09-01", null)],
      groupsById: new Map([
        ["A", { id: "A", academicYear: "2026-27", year: 2 } as never],
        ["B", { id: "B", academicYear: "2026-27", year: 2 } as never],
      ]),
      trackKeyByYear: new Map([["2026-27:2", "T"]]),
      calendarByTrack: new Map([
        [
          "T",
          new Map([
            ["2026-07-06", { kind: "instruction", dayOrder: null, label: null }], // Monday
            ["2026-09-07", { kind: "instruction", dayOrder: null, label: null }], // Monday
          ]),
        ],
      ]),
      timetableByGroupDow: new Map([
        ["A:1", [{ period: 1, kind: "course", electiveGroupId: null, courseCode: "OLD101" }]],
        ["B:1", [{ period: 1, kind: "course", electiveGroupId: null, courseCode: "NEW202" }]],
      ]),
    });

    const days = resolveDaysInRange(bundle, "2026-07-06", "2026-09-07");
    const july = days.find((d) => d.date === "2026-07-06");
    const sept = days.find((d) => d.date === "2026-09-07");

    expect(july?.slots).toEqual([{ period: 1, courseCode: "OLD101" }]);
    expect(sept?.slots).toEqual([{ period: 1, courseCode: "NEW202" }]);
  });
});

describe("orphaned exceptions survive a calendar flip (spec §20, invariant 4)", () => {
  // resolveDaysInRange never sees attendance_exception at all — exceptions
  // are looked up separately, keyed only by (date, period), entirely from
  // the *current* set of resolved days (compute.ts's getException callback).
  // So there is no code path that could delete an exception row when a
  // date's calendar kind changes — this test demonstrates the mechanism:
  // the day simply drops out of (or back into) the resolved list.
  const baseBundle = (kind: "instruction" | "holiday") =>
    emptyBundle({
      memberships: [membership("A", "2026-07-01", null)],
      groupsById: new Map([["A", { id: "A", academicYear: "2026-27", year: 2 } as never]]),
      trackKeyByYear: new Map([["2026-27:2", "T"]]),
      calendarByTrack: new Map([["T", new Map([["2026-09-12", { kind, dayOrder: kind === "instruction" ? 3 : null, label: null }]])]]),
      timetableByGroupDow: new Map([
        ["A:3", [{ period: 1, kind: "course", electiveGroupId: null, courseCode: "CS24512" }]],
      ]),
    });

  it("a working day produces a resolved day with its slots", () => {
    const days = resolveDaysInRange(baseBundle("instruction"), "2026-09-12", "2026-09-12");
    expect(days).toHaveLength(1);
    expect(days[0].slots).toEqual([{ period: 1, courseCode: "CS24512" }]);
  });

  it("marking that date a holiday drops it from the resolved days entirely — an exception on it would no longer be counted", () => {
    const days = resolveDaysInRange(baseBundle("holiday"), "2026-09-12", "2026-09-12");
    expect(days).toHaveLength(0);
  });

  it("flipping it back to working brings the exact same slots back", () => {
    const days = resolveDaysInRange(baseBundle("instruction"), "2026-09-12", "2026-09-12");
    expect(days).toHaveLength(1);
    expect(days[0].slots).toEqual([{ period: 1, courseCode: "CS24512" }]);
  });
});
