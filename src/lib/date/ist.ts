import { COLLEGE } from "@/config/college";

/**
 * All "today" and calendar-date arithmetic in the app must go through here.
 * Vercel runs UTC; after 18:30 IST the server is already on tomorrow, so a
 * bare `new Date()` is forbidden outside this file (CLAUDE.md, spec §12).
 *
 * Calendar dates are plain `YYYY-MM-DD` strings throughout — they represent
 * a civil date, not an instant, so day-of-week and range arithmetic use
 * `Date.UTC` internally to stay immune to the host machine's local
 * timezone. Only `todayIST` needs to know about a real clock.
 */

const istFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: COLLEGE.timezone,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Today's date in Asia/Kolkata, as `YYYY-MM-DD`. The only clock read in the app. */
export function todayIST(): string {
  // en-CA formats as YYYY-MM-DD.
  return istFormatter.format(new Date());
}

export function parseISODate(iso: string): { y: number; m: number; d: number } {
  const [y, m, d] = iso.split("-").map(Number);
  return { y, m, d };
}

/** ISO weekday: 1 = Monday .. 7 = Sunday. Never call `Date#getDay()` elsewhere. */
export function isoWeekday(iso: string): number {
  const { y, m, d } = parseISODate(iso);
  const jsDay = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = Sunday
  return jsDay === 0 ? 7 : jsDay;
}

export function addDays(iso: string, days: number): string {
  const { y, m, d } = parseISODate(iso);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

/** Inclusive comparison: is `iso` within [start, end]? Plain string dates sort lexicographically. */
export function isBetween(iso: string, start: string, end: string): boolean {
  return iso >= start && iso <= end;
}

export function compareDates(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function* dateRange(startIso: string, endIso: string): Generator<string> {
  let cur = startIso;
  while (cur <= endIso) {
    yield cur;
    cur = addDays(cur, 1);
  }
}
