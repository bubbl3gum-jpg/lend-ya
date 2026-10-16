export type AppliedMigration = {
  migration_name: string;
  checksum: string;
  finished_at: unknown;
  rolled_back_at: unknown;
};
export const officialMrtMigration = "20261016100000_official_mrt_stations";
/** Refuse unknown, changed, failed or incomplete Admin histories; never resolve or mutate them. */
export function inspectMigrationHistory(
  files: Record<string, string>,
  history: AppliedMigration[],
) {
  const active = history.filter((row) => !row.rolled_back_at);
  if (active.some((row) => !row.finished_at))
    throw Error(
      "An unresolved failed migration exists. Stop and investigate its logs; do not reset or resolve automatically.",
    );
  for (const row of active) {
    if (!files[row.migration_name])
      throw Error(
        `Applied migration is missing locally: ${row.migration_name}`,
      );
    if (files[row.migration_name] !== row.checksum)
      throw Error(
        `Applied migration checksum differs: ${row.migration_name}. Do not rewrite migration files.`,
      );
  }
  const applied = new Set(active.map((row) => row.migration_name));
  const pending = Object.keys(files)
    .filter((name) => !applied.has(name))
    .sort();
  if (pending.some((name) => name !== officialMrtMigration))
    throw Error(
      `This is not the verified complete Admin/MVP starting state; pending migrations include ${pending.join(", ")}. Stop for separate migration review.`,
    );
  return { applied: [...applied].sort(), pending };
}
