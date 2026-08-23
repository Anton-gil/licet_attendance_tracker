/**
 * Pure predicate, no DB import — kept separate from
 * require-group-membership.ts (which pulls in the Drizzle client at
 * module scope) so it stays unit-testable without a database connection,
 * same reasoning as resolve-date-core.ts vs resolve-date.ts.
 *
 * Membership here means "ever a member," not "covering a specific date"
 * (that's `findMembershipForDate` in src/lib/attendance/resolve-days.ts,
 * used by the attendance math). This one guards mutations: "is this
 * student allowed to touch this group's timetable/electives at all."
 */
export function isMemberOfGroup(memberships: { groupId: string }[], groupId: string): boolean {
  return memberships.some((m) => m.groupId === groupId);
}
