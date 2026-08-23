import { canMissBuffer } from "./recovery";

export type RiskState = "no-data" | "below" | "fragile" | "comfortable";

/** Below threshold / one absence from dropping / comfortable margin — spec §11. Neutral, not alarmist: this feeds copy and color, never a red "crisis" banner. */
export function riskState(percentage: number | null, present: number, conducted: number, targetPercent: number): RiskState {
  if (percentage === null) return "no-data";
  if (percentage < targetPercent) return "below";
  const buffer = canMissBuffer({ present, conducted, targetPercent });
  return buffer <= 1 ? "fragile" : "comfortable";
}
