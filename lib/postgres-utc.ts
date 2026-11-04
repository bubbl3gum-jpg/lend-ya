/** Prisma DateTime columns are UTC instants stored as timestamp without time zone.
 * Pin each adapter connection, not the database/server or the process timezone.
 * The locked pg adapter also requires UTC when decoding timestamptz results.
 */
export function utcPostgresUrl(connectionString: string): string {
  const url = new URL(connectionString);
  const options = url.searchParams.get("options");
  url.searchParams.set("options", `${options ? `${options} ` : ""}-c timezone=UTC`);
  return url.toString();
}
