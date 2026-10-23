import { logOperationalError } from "../lib/operational-error";
import "dotenv/config";
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { Client } from "pg";
import {
  inspectMigrationHistory,
  officialMrtMigration,
} from "../lib/migration-history";
async function main() {
  if (!process.env.DATABASE_URL)
    throw Error(
      "DATABASE_URL is required; use the intended existing database binding.",
    );
  const url = new URL(process.env.DATABASE_URL),
    client = new Client({ connectionString: url.toString() });
  const files: Record<string, string> = {};
  for (const name of (await readdir("prisma/migrations")).filter((name) =>
    /^\d/.test(name),
  ))
    files[name] = createHash("sha256")
      .update(await readFile(`prisma/migrations/${name}/migration.sql`))
      .digest("hex");
  await client.connect();
  try {
    await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    const history = (
      await client.query(
        'SELECT migration_name,checksum,finished_at,rolled_back_at FROM "_prisma_migrations" ORDER BY started_at',
      )
    ).rows;
    const result = inspectMigrationHistory(files, history);
    const columns = (
      await client.query(
        "SELECT table_name,column_name FROM information_schema.columns WHERE table_schema=current_schema()",
      )
    ).rows;
    const has = (table: string, column: string) =>
      columns.some(
        (row) => row.table_name === table && row.column_name === column,
      );
    for (const [table, column] of [
      ["Listing", "adminRestricted"],
      ["User", "accountStatus"],
      ["Booking", "cancelledBy"],
      ["Booking", "dailyPrice"],
      ["Handoff", "ownerConditionConfirmed"],
      ["Return", "inspectionAccepted"],
      ["BookingEvidencePhoto", "data"],
      ["AdminAuditLog", "action"],
      ["AuthRateLimit", "attempts"],
    ])
      if (!has(table, column))
        throw Error(
          `Recorded Admin migration state does not match schema: missing ${table}.${column}`,
        );
    const metadata = [
      "canonicalId",
      "nameEn",
      "nameZh",
      "lineCodes",
      "operatorIds",
      "systemIds",
      "operational",
    ];
    const expectedPresent = !result.pending.includes(officialMrtMigration);
    if (
      metadata.some((column) => has("MrtStation", column) !== expectedPresent)
    )
      throw Error(
        "MRT metadata does not match recorded migration state. Stop for drift review before applying migrations.",
      );
    const stats = (
      await client.query(
        'SELECT (SELECT count(*) FROM "User")::int AS users,(SELECT count(*) FROM "Listing")::int AS listings,(SELECT count(*) FROM "Booking")::int AS bookings,(SELECT count(*) FROM "Listing" WHERE "adminRestricted")::int AS restricted_listings',
      )
    ).rows[0];
    const stations = (
      await client.query(
        "SELECT id,code,name FROM \"MrtStation\" WHERE code IN ('TPE','ZSH','XIM','JNT','SSH') ORDER BY id",
      )
    ).rows;
    await client.query("ROLLBACK");
    console.log(
      JSON.stringify(
        {
          status: "preflight-passed",
          database: {
            host: url.hostname,
            port: url.port || "5432",
            name: url.pathname.slice(1),
          },
          ...result,
          records: stats,
          legacyStations: stations,
          next: result.pending.length
            ? "Back up this database, inspect the read-only Prisma migration diff, then deploy only the listed migration. No changes were made."
            : "No pending migrations. Verify application behavior. No changes were made.",
        },
        null,
        2,
      ),
    );
  } finally {
    await client.end();
  }
}
main().catch((error) => {
  logOperationalError("database.preflight", error);
  process.exitCode = 1;
});
