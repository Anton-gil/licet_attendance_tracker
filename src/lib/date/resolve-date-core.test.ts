import { describe, expect, it } from "vitest";
import { resolveDateCore } from "./resolve-date-core";
import type { CalendarEntry, ResolverContext } from "./types";

function emptyContext(overrides: Partial<ResolverContext> = {}): ResolverContext {
  return {
    studentTrack: null,
    personalOverrides: new Map(),
    confirmedGroupOverrides: new Map(),
    calendarByTrack: new Map(),
    generalHolidays: new Set(),
    ...overrides,
  };
}

describe("resolveDateCore — fallback chain (spec §7.2)", () => {
  it("step 6: bare Mon–Fri guess when nothing else is known", () => {
    // 2026-08-24 is a Monday.
    const r = resolveDateCore("2026-08-24", emptyContext());
    expect(r).toMatchObject({ isInstruction: true, effectiveDow: 1, confidence: "guessed" });
  });

  it("step 6: a bare weekend guess is not instruction", () => {
    // 2026-08-22 is a Saturday.
    const r = resolveDateCore("2026-08-22", emptyContext());
    expect(r).toMatchObject({ isInstruction: false, effectiveDow: null, confidence: "guessed" });
  });

  it("step 5: Mon–Fri minus the general holiday list, once that list exists", () => {
    const ctx = emptyContext({ generalHolidays: new Set(["2026-08-15"]) });
    const holiday = resolveDateCore("2026-08-15", ctx); // Saturday, but a known holiday
    expect(holiday).toMatchObject({ isInstruction: false, confidence: "inferred" });

    const ordinaryMonday = resolveDateCore("2026-08-24", ctx);
    expect(ordinaryMonday).toMatchObject({ isInstruction: true, effectiveDow: 1, confidence: "inferred" });
  });

  it("step 4: borrows another track's official calendar in the same academic year", () => {
    const ctx = emptyContext({
      studentTrack: "FY", // FY has no seeded calendar rows yet
      calendarByTrack: new Map([
        ["II-III", new Map([["2026-09-01", { kind: "instruction" as const, dayOrder: null, label: null }]])],
      ]),
    });
    const r = resolveDateCore("2026-09-01", ctx);
    expect(r).toMatchObject({ isInstruction: true, confidence: "borrowed", source: "borrowed_calendar" });
  });

  it("step 3: the student's own track's official calendar wins over a borrowed one", () => {
    const ctx = emptyContext({
      studentTrack: "II-III",
      calendarByTrack: new Map<string, Map<string, CalendarEntry>>([
        ["II-III", new Map([["2026-09-01", { kind: "holiday", dayOrder: null, label: "Dept event" }]])],
        ["FY", new Map([["2026-09-01", { kind: "instruction", dayOrder: null, label: null }]])],
      ]),
    });
    const r = resolveDateCore("2026-09-01", ctx);
    expect(r).toMatchObject({ isInstruction: false, confidence: "official", source: "calendar", label: "Dept event" });
  });

  it("official calendar: only kind='instruction' counts, sepe/see/study_holiday/vacation don't (spec §7.8)", () => {
    for (const kind of ["sepe", "see", "study_holiday", "vacation", "holiday"] as const) {
      const ctx = emptyContext({
        studentTrack: "II-III",
        calendarByTrack: new Map([["II-III", new Map([["2026-11-03", { kind, dayOrder: null, label: null }]])]]),
      });
      const r = resolveDateCore("2026-11-03", ctx);
      expect(r.isInstruction, `kind=${kind}`).toBe(false);
      expect(r.effectiveDow, `kind=${kind}`).toBeNull();
    }
  });

  it("day_order on a calendar entry overrides the raw weekday (working Saturday)", () => {
    const ctx = emptyContext({
      studentTrack: "II-III",
      // 2026-09-12 is a Saturday, made a working day that follows Wednesday's timetable.
      calendarByTrack: new Map([
        ["II-III", new Map([["2026-09-12", { kind: "instruction" as const, dayOrder: 3, label: null }]])],
      ]),
    });
    const r = resolveDateCore("2026-09-12", ctx);
    expect(r).toMatchObject({ isInstruction: true, effectiveDow: 3, confidence: "official" });
  });

  it("step 2: a confirmed group override beats the official calendar", () => {
    const ctx = emptyContext({
      studentTrack: "II-III",
      calendarByTrack: new Map([
        ["II-III", new Map([["2026-09-12", { kind: "holiday" as const, dayOrder: null, label: null }]])],
      ]),
      confirmedGroupOverrides: new Map([["2026-09-12", { kind: "instruction" as const, dayOrder: 3 }]]),
    });
    const r = resolveDateCore("2026-09-12", ctx);
    expect(r).toMatchObject({ isInstruction: true, effectiveDow: 3, confidence: "exact", source: "group_override" });
  });

  it("step 1: a personal override beats a confirmed group override", () => {
    const ctx = emptyContext({
      confirmedGroupOverrides: new Map([["2026-09-12", { kind: "instruction" as const, dayOrder: 3 }]]),
      personalOverrides: new Map([["2026-09-12", { kind: "holiday" as const, dayOrder: null }]]),
    });
    const r = resolveDateCore("2026-09-12", ctx);
    expect(r).toMatchObject({ isInstruction: false, confidence: "exact", source: "personal_override" });
  });

  it("a personal override on an ordinary working day defaults effectiveDow to the raw weekday", () => {
    const ctx = emptyContext({
      // 2026-08-24 is a Monday.
      personalOverrides: new Map([["2026-08-24", { kind: "instruction" as const, dayOrder: null }]]),
    });
    const r = resolveDateCore("2026-08-24", ctx);
    expect(r).toMatchObject({ isInstruction: true, effectiveDow: 1 });
  });
});
