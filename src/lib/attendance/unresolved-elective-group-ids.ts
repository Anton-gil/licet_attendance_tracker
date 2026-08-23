/**
 * Pure set-difference, no DB import — kept separate from electives.ts
 * (which pulls in the Drizzle client at module scope) so it stays
 * unit-testable without a database connection, same reasoning as
 * resolve-date-core.ts vs resolve-date.ts.
 */
export function unresolvedElectiveGroupIds(
  requiredElectiveGroupIds: string[],
  chosenElectiveGroupIds: string[],
): string[] {
  const chosen = new Set(chosenElectiveGroupIds);
  return [...new Set(requiredElectiveGroupIds)].filter((id) => !chosen.has(id));
}
