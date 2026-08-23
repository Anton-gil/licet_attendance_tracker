/**
 * LICET configuration — never varies across sections, never asked of a
 * student. docs/spec.md §1.
 */
export const COLLEGE = {
  name: "Loyola-ICAM College of Engineering and Technology",
  short: "LICET",
  timezone: "Asia/Kolkata",
  workingDays: [1, 2, 3, 4, 5], // Mon–Fri
  periodsPerDay: 8,
  periodsPerWeek: 40,
  timetableFormat: "8a-rev03",

  periods: [
    { n: 1, start: "08:00", end: "09:00" }, // 60 min
    { n: 2, start: "09:00", end: "09:50" },
    // BREAK 09:50–10:10
    { n: 3, start: "10:10", end: "11:00" },
    { n: 4, start: "11:00", end: "11:50" },
    { n: 5, start: "11:50", end: "12:40" },
    // LUNCH 12:40–13:30
    { n: 6, start: "13:30", end: "14:20" },
    { n: 7, start: "14:20", end: "15:10" },
    { n: 8, start: "15:10", end: "16:00" },
  ] as const,

  breakAfterPeriod: 2,
  lunchAfterPeriod: 5,
  defaultThreshold: 75,
} as const;

export const ODD_SEM_2026 = {
  academicYear: "2026-27",
  label: "Odd (July–December 2026)",

  // Official working-day counts, from the academic calendar.
  workingDaysByMonth: { 7: 24, 8: 22, 9: 22, 10: 20, 11: 5 } as const,
  totalWorkingDays: { "II-III": 93, FY: 79 } as const,

  commencement: {
    "II-III": "2026-07-01",
    FY: null,
    IV: null,
  } as const, // FY/IV: read from sheet once available

  sepeBegins: "2026-11-02", // practical exams — no regular classes
  studyHoliday: "2026-11-07",
  seeBegins: "2026-11-16",
  reopening: "2027-01-04",

  attendanceVerification: ["2026-09-16", "2026-10-14"], // official checkpoints — verify
} as const;
