/**
 * Known-correct golden fixture from docs/spec.md §2 — the reference
 * section's weekly load. Every course's weekly period count below matches
 * the spec's table exactly; the grid sums to 40. Use this to validate the
 * manual timetable builder, the extraction parser, and the "38/40" counter.
 */

export type GoldenSlot = {
  day: 1 | 2 | 3 | 4 | 5; // Mon..Fri
  period: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  kind: "course" | "elective" | "activity" | "admin";
  code: string | null; // null for ABSL / MENTORING
  abbrev: string; // display variant, e.g. 'CN' vs 'CN LAB'
  isLab: boolean;
  blockId: string | null; // shared id across a merged lab/elective block
};

export const GOLDEN_TIMETABLE: GoldenSlot[] = [
  // Monday
  { day: 1, period: 1, kind: "course", code: "GE24501", abbrev: "PMOM", isLab: false, blockId: null },
  { day: 1, period: 2, kind: "activity", code: null, abbrev: "ABSL", isLab: false, blockId: null },
  { day: 1, period: 3, kind: "elective", code: "PE-1", abbrev: "AE/FSWD", isLab: true, blockId: "mon-pe1" },
  { day: 1, period: 4, kind: "elective", code: "PE-1", abbrev: "AE/FSWD", isLab: true, blockId: "mon-pe1" },
  { day: 1, period: 5, kind: "course", code: "FC24501", abbrev: "UHVSL", isLab: false, blockId: null },
  { day: 1, period: 6, kind: "course", code: "AD24412", abbrev: "DVST", isLab: false, blockId: null },
  { day: 1, period: 7, kind: "course", code: "CS24512", abbrev: "CN", isLab: false, blockId: null },
  { day: 1, period: 8, kind: "course", code: "AD24501", abbrev: "BDA", isLab: false, blockId: null },

  // Tuesday
  { day: 2, period: 1, kind: "course", code: "CS24512", abbrev: "CN", isLab: false, blockId: null },
  { day: 2, period: 2, kind: "course", code: "AD24501", abbrev: "BDA", isLab: false, blockId: null },
  { day: 2, period: 3, kind: "course", code: "AD24502", abbrev: "NNDL", isLab: false, blockId: null },
  { day: 2, period: 4, kind: "course", code: "CS24512", abbrev: "CN Lab", isLab: true, blockId: "tue-cn-lab" },
  { day: 2, period: 5, kind: "course", code: "CS24512", abbrev: "CN Lab", isLab: true, blockId: "tue-cn-lab" },
  { day: 2, period: 6, kind: "course", code: "AD24502", abbrev: "NNDL", isLab: false, blockId: null },
  { day: 2, period: 7, kind: "course", code: "BS24502", abbrev: "LRAT", isLab: false, blockId: null },
  { day: 2, period: 8, kind: "elective", code: "PE-1", abbrev: "AE/FSWD", isLab: false, blockId: null },

  // Wednesday
  { day: 3, period: 1, kind: "course", code: "AD24412", abbrev: "DVST", isLab: false, blockId: null },
  { day: 3, period: 2, kind: "elective", code: "PE-1", abbrev: "AE/FSWD", isLab: false, blockId: null },
  { day: 3, period: 3, kind: "activity", code: null, abbrev: "ABSL", isLab: false, blockId: null },
  { day: 3, period: 4, kind: "course", code: "AD24412", abbrev: "DVST Lab", isLab: true, blockId: "wed-dvst-lab" },
  { day: 3, period: 5, kind: "course", code: "AD24412", abbrev: "DVST Lab", isLab: true, blockId: "wed-dvst-lab" },
  { day: 3, period: 6, kind: "elective", code: "PE-1", abbrev: "AE/FSWD", isLab: false, blockId: null },
  { day: 3, period: 7, kind: "course", code: "AD24502", abbrev: "NNDL", isLab: false, blockId: null },
  { day: 3, period: 8, kind: "admin", code: null, abbrev: "MENTORING", isLab: false, blockId: null },

  // Thursday
  { day: 4, period: 1, kind: "course", code: "AD24502", abbrev: "NNDL", isLab: false, blockId: null },
  { day: 4, period: 2, kind: "course", code: "GE24501", abbrev: "PMOM", isLab: false, blockId: null },
  { day: 4, period: 3, kind: "course", code: "AD24501", abbrev: "BDA", isLab: false, blockId: null },
  { day: 4, period: 4, kind: "course", code: "AD24412", abbrev: "DVST", isLab: false, blockId: null },
  { day: 4, period: 5, kind: "course", code: "CS24512", abbrev: "CN", isLab: false, blockId: null },
  { day: 4, period: 6, kind: "course", code: "AD24521", abbrev: "BDA Lab", isLab: true, blockId: "thu-bda-lab" },
  { day: 4, period: 7, kind: "course", code: "AD24521", abbrev: "BDA Lab", isLab: true, blockId: "thu-bda-lab" },
  { day: 4, period: 8, kind: "course", code: "AD24521", abbrev: "BDA Lab", isLab: true, blockId: "thu-bda-lab" },

  // Friday
  { day: 5, period: 1, kind: "course", code: "AD24501", abbrev: "BDA", isLab: false, blockId: null },
  { day: 5, period: 2, kind: "course", code: "BS24502", abbrev: "LRAT", isLab: false, blockId: null },
  { day: 5, period: 3, kind: "course", code: "CS24512", abbrev: "CN", isLab: false, blockId: null },
  { day: 5, period: 4, kind: "course", code: "GE24501", abbrev: "PMOM", isLab: false, blockId: null },
  { day: 5, period: 5, kind: "course", code: "AD24412", abbrev: "DVST", isLab: false, blockId: null },
  { day: 5, period: 6, kind: "course", code: "AD24522", abbrev: "DL Lab", isLab: true, blockId: "fri-dl-lab" },
  { day: 5, period: 7, kind: "course", code: "AD24522", abbrev: "DL Lab", isLab: true, blockId: "fri-dl-lab" },
  { day: 5, period: 8, kind: "course", code: "AD24522", abbrev: "DL Lab", isLab: true, blockId: "fri-dl-lab" },
];

/** Weekly period count per course code, per docs/spec.md §2's reference table. */
export const GOLDEN_WEEKLY_COUNTS: Record<string, number> = {
  AD24501: 4,
  AD24502: 4,
  GE24501: 3,
  AD24412: 6,
  CS24512: 6,
  BS24502: 2,
  FC24501: 1,
  AD24521: 3,
  AD24522: 3,
  "PE-1": 5,
};

export const GOLDEN_ACTIVITY_ADMIN_COUNT = 3; // ABSL x2 + MENTORING x1
