import { describe, expect, it } from "vitest";
import { GOLDEN_ACTIVITY_ADMIN_COUNT, GOLDEN_TIMETABLE, GOLDEN_WEEKLY_COUNTS } from "./golden-timetable";

describe("golden timetable fixture (spec §2)", () => {
  it("has exactly 40 weekly periods, one per (day, period) slot", () => {
    expect(GOLDEN_TIMETABLE).toHaveLength(40);
    const seen = new Set(GOLDEN_TIMETABLE.map((s) => `${s.day}-${s.period}`));
    expect(seen.size).toBe(40);
  });

  it("matches the reference weekly load per course code exactly", () => {
    const counts: Record<string, number> = {};
    for (const slot of GOLDEN_TIMETABLE) {
      if (slot.code) counts[slot.code] = (counts[slot.code] ?? 0) + 1;
    }
    expect(counts).toEqual(GOLDEN_WEEKLY_COUNTS);
  });

  it("has the expected number of activity/admin (ABSL/MENTORING) slots", () => {
    const n = GOLDEN_TIMETABLE.filter((s) => s.kind === "activity" || s.kind === "admin").length;
    expect(n).toBe(GOLDEN_ACTIVITY_ADMIN_COUNT);
  });

  it("gives CS24512 and AD24412 exactly one course code each despite theory+lab variants (spec §2)", () => {
    const cnVariants = new Set(GOLDEN_TIMETABLE.filter((s) => s.code === "CS24512").map((s) => s.abbrev));
    const dvstVariants = new Set(GOLDEN_TIMETABLE.filter((s) => s.code === "AD24412").map((s) => s.abbrev));
    expect(cnVariants).toEqual(new Set(["CN", "CN Lab"]));
    expect(dvstVariants).toEqual(new Set(["DVST", "DVST Lab"]));
  });
});
