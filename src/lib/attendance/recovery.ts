/**
 * "Can miss N more" and the recovery calculator — spec §11, §19.1.
 * `targetPercent` is 0–100 (matches `student.threshold`), converted to a
 * fraction internally.
 */

export type CanMissInput = {
  present: number;
  conducted: number;
  targetPercent: number;
};

/**
 * Buffer — "how many can I miss before dropping below target right now."
 * The headline number (spec §19.1, resolved): conservative, and what
 * "can I skip tomorrow" actually means. Clamped to 0 — a student already
 * below target has no room, not negative room.
 */
export function canMissBuffer({ present, conducted, targetPercent }: CanMissInput): number {
  const target = targetPercent / 100;
  if (target <= 0) return Infinity;
  const buffer = Math.floor(present / target - conducted);
  return Math.max(0, buffer);
}

export type CanMissBudgetInput = CanMissInput & { remainingPeriods: number };

/**
 * Budget — "how many can I miss across the rest of the semester and still
 * finish at target." Shown only on the course detail screen, labelled
 * differently from the buffer (spec §19.1).
 */
export function canMissBudget({ present, conducted, targetPercent, remainingPeriods }: CanMissBudgetInput): number {
  const target = targetPercent / 100;
  const budget = Math.floor(present + remainingPeriods - target * (conducted + remainingPeriods));
  return Math.max(0, budget);
}

export type RecoveryInput = {
  present: number;
  conducted: number;
  targetPercent: number;
  /** Remaining **instruction** periods for this course/overall — never remaining calendar days (spec §7.8/§11: counting calendar days produces numbers larger than the semester has left). */
  remainingInstructionPeriods: number;
};

export type RecoveryResult =
  | { reachable: true; needed: number }
  | { reachable: false; bestCasePercentage: number };

/**
 * `needed = ceil((target × total − present) ÷ (1 − target))`, guarded
 * against `target = 1` (division by zero) and clamped so an
 * already-above-target student gets 0, not a negative count (spec §19.1).
 * Checked against remaining instruction periods so it never claims more
 * classes are available than the semester actually has left.
 */
export function recover({ present, conducted, targetPercent, remainingInstructionPeriods }: RecoveryInput): RecoveryResult {
  const target = targetPercent / 100;

  if (target <= 0) return { reachable: true, needed: 0 };

  if (target >= 1) {
    // 100%+ is only "reachable" if there's nothing left to lose, i.e. no
    // absences ever recorded — otherwise no finite number of future
    // classes can average it back to exactly 1.
    const alreadyPerfect = present === conducted;
    return alreadyPerfect
      ? { reachable: true, needed: 0 }
      : { reachable: false, bestCasePercentage: bestCase(present, conducted, remainingInstructionPeriods) };
  }

  const needed = Math.max(0, Math.ceil((target * conducted - present) / (1 - target)));

  if (needed <= remainingInstructionPeriods) {
    return { reachable: true, needed };
  }

  return {
    reachable: false,
    bestCasePercentage: bestCase(present, conducted, remainingInstructionPeriods),
  };
}

function bestCase(present: number, conducted: number, remainingInstructionPeriods: number): number {
  const total = conducted + remainingInstructionPeriods;
  if (total === 0) return 0;
  return ((present + remainingInstructionPeriods) / total) * 100;
}
