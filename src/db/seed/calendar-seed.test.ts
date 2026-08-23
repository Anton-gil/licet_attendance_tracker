import { describe, expect, it } from "vitest";
import { ODD_SEM_2026 } from "@/config/college";
import { buildIIIIICalendarRows } from "./build-calendar-rows";

// Mirrors the check in assert-calendar.ts (spec §7.9/§18) so `npm test`
// catches a drifted seed too, not just `npm run assert:calendar`.
const EXPECTED_WORKING_SATURDAY_GAP: Record<number, number> = { 7: 2, 8: 2, 9: 2, 10: 1 };

describe("II-III calendar seed matches the printed monthly totals (spec §7.9)", () => {
  const rows = buildIIIIICalendarRows();

  it("Jul–Oct: Mon–Fri instruction days are short by exactly the documented working-Saturday gap", () => {
    for (const month of [7, 8, 9, 10] as const) {
      const monthKey = String(month).padStart(2, "0");
      const computed = rows.filter((r) => r.kind === "instruction" && r.date.slice(5, 7) === monthKey).length;
      const gap = ODD_SEM_2026.workingDaysByMonth[month] - computed;
      expect(gap, `month ${monthKey}`).toBe(EXPECTED_WORKING_SATURDAY_GAP[month]);
    }
  });

  it("Nov: SEPE days exactly match the official working-day count (no Saturday ambiguity)", () => {
    const computed = rows.filter((r) => r.kind === "sepe" && r.date.slice(5, 7) === "11").length;
    expect(computed).toBe(ODD_SEM_2026.workingDaysByMonth[11]);
  });

  it("never seeds a plain Saturday/Sunday (unseeded Saturdays fall through to the resolver's fallback, spec §7.3)", () => {
    for (const row of rows) {
      const dow = new Date(`${row.date}T00:00:00Z`).getUTCDay();
      if (dow === 0 || dow === 6) {
        expect(row.kind, `${row.date} is a weekend row`).toBe("holiday");
      }
    }
  });
});
