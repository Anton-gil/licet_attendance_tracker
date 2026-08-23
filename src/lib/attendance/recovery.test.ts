import { describe, expect, it } from "vitest";
import { canMissBudget, canMissBuffer, recover } from "./recovery";

// The worked example from spec §19.1: CS24512 at 52 present of 56
// conducted, 40 periods left in the semester, 75% target.
describe("can-miss formulas (spec §19.1)", () => {
  it("buffer: how many can I miss right now and stay at/above target", () => {
    expect(canMissBuffer({ present: 52, conducted: 56, targetPercent: 75 })).toBe(13);
  });

  it("budget: how many can I miss across the rest of the semester", () => {
    expect(canMissBudget({ present: 52, conducted: 56, targetPercent: 75, remainingPeriods: 40 })).toBe(20);
  });

  it("buffer clamps to 0 instead of going negative once already below target", () => {
    expect(canMissBuffer({ present: 10, conducted: 20, targetPercent: 75 })).toBe(0);
  });
});

describe("recovery calculator (spec §11)", () => {
  it("returns 0 needed for an already-on-target student", () => {
    const r = recover({ present: 75, conducted: 100, targetPercent: 75, remainingInstructionPeriods: 50 });
    expect(r).toEqual({ reachable: true, needed: 0 });
  });

  it("computes classes needed when the target is reachable within what's left", () => {
    // present=60, conducted=100, target 75% → need ceil((0.75*100-60)/0.25) = ceil(60) = 60.
    const r = recover({ present: 60, conducted: 100, targetPercent: 75, remainingInstructionPeriods: 96 });
    expect(r).toEqual({ reachable: true, needed: 60 });
  });

  it("reports unreachable with a best-case percentage when the semester doesn't have enough periods left", () => {
    const r = recover({ present: 60, conducted: 100, targetPercent: 75, remainingInstructionPeriods: 12 });
    expect(r.reachable).toBe(false);
    if (!r.reachable) {
      // best case = (60+12)/(100+12) = 72/112 ≈ 64.3%
      expect(r.bestCasePercentage).toBeCloseTo(64.29, 1);
    }
  });

  it("guards target=1 (would otherwise divide by zero) and reports unreachable unless already perfect", () => {
    const imperfect = recover({ present: 90, conducted: 100, targetPercent: 100, remainingInstructionPeriods: 50 });
    expect(imperfect.reachable).toBe(false);

    const perfect = recover({ present: 100, conducted: 100, targetPercent: 100, remainingInstructionPeriods: 50 });
    expect(perfect).toEqual({ reachable: true, needed: 0 });
  });

  it("guards target<=0 as trivially satisfied", () => {
    const r = recover({ present: 0, conducted: 100, targetPercent: 0, remainingInstructionPeriods: 0 });
    expect(r).toEqual({ reachable: true, needed: 0 });
  });
});
