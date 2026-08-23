/**
 * Build-time-only regression check for the calendar seed — docs/spec.md
 * §7.9 / §18. Never runs in a request path and never surfaces to a
 * student; a mismatch here means the seed data drifted from the printed
 * academic calendar, not that the app should stop serving anyone.
 *
 * Run with `npm run assert:calendar`. Wired into `npm run build` so a bad
 * seed edit fails CI instead of shipping silently wrong denominators.
 */
import { ODD_SEM_2026 } from "@/config/college";
import { buildIIIIICalendarRows } from "./build-calendar-rows";

// The gap between a plain Mon–Fri week and the printed monthly totals,
// i.e. how many working Saturdays each month is known to be missing.
// Spec §1: "The gap is seven working Saturdays already scheduled."
const EXPECTED_WORKING_SATURDAY_GAP: Record<number, number> = {
  7: 2,
  8: 2,
  9: 2,
  10: 1,
};

function main() {
  const rows = buildIIIIICalendarRows();
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const month of [7, 8, 9, 10] as const) {
    const monthKey = String(month).padStart(2, "0");
    const computedInstructionDays = rows.filter(
      (r) => r.kind === "instruction" && r.date.slice(5, 7) === monthKey,
    ).length;

    const official = ODD_SEM_2026.workingDaysByMonth[month];
    const gap = official - computedInstructionDays;
    const expectedGap = EXPECTED_WORKING_SATURDAY_GAP[month];

    if (gap !== expectedGap) {
      errors.push(
        `Month ${monthKey}: computed ${computedInstructionDays} Mon–Fri instruction days, ` +
          `official total is ${official} → implies a gap of ${gap} working Saturdays, ` +
          `but the spec documents ${expectedGap}. The holiday seed (or an instruction-range ` +
          `boundary) has drifted from the printed calendar.`,
      );
    } else {
      warnings.push(
        `Month ${monthKey}: ${gap} working Saturday(s) still unseeded (dates/day-orders unknown — ` +
          `read them off the calendar's Saturday shading and seed explicitly). Admin-page warning only.`,
      );
    }
  }

  // November: entirely SEPE days per the spec, no Mon–Fri/Saturday ambiguity.
  const computedSepeDays = rows.filter((r) => r.kind === "sepe" && r.date.slice(5, 7) === "11").length;
  const officialNov = ODD_SEM_2026.workingDaysByMonth[11];
  if (computedSepeDays !== officialNov) {
    errors.push(
      `November: computed ${computedSepeDays} SEPE days, official total is ${officialNov}. ` +
        `Check SEPE_RANGE in calendar-data.ts against the printed calendar.`,
    );
  }

  for (const w of warnings) console.warn(`[assert:calendar] ${w}`);

  if (errors.length > 0) {
    for (const e of errors) console.error(`[assert:calendar] ${e}`);
    throw new Error(`Calendar seed assertion failed (${errors.length} issue(s)) — see above.`);
  }

  const totalGap = Object.values(EXPECTED_WORKING_SATURDAY_GAP).reduce((a, b) => a + b, 0);
  console.log(
    `[assert:calendar] OK — ${rows.length} calendar rows for II-III consistent with the printed ` +
      `monthly totals, minus the ${totalGap} documented-but-unseeded working Saturdays.`,
  );
}

main();
