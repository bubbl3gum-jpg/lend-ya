import "dotenv/config";
import { spawn, type ChildProcess } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import { once } from "node:events";
import path from "node:path";
import {
  assertOwnedDatabase,
  connectTestDatabaseTarget,
  testDatabaseUrl,
  testRunId,
} from "../tests/support/test-database";

async function main() {
  if (process.env.NODE_ENV === "production") throw Error("Development only.");
  const url = testDatabaseUrl(
    process.env.MRT_TEST_DATABASE_URL,
    process.env.DATABASE_URL,
  );
  const database = url.pathname.slice(1),
    runId = testRunId();
  const admin = await connectTestDatabaseTarget(url, true);
  let owned = false,
    app: ChildProcess | undefined;
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    NODE_ENV: "development",
    DATABASE_URL: url.toString(),
    MRT_TEST_DATABASE_URL: url.toString(),
    MRT_TEST_RUN_ID: runId,
    MEETUP_TEST_LOCATION_ENABLED: "true",
    MEETUP_CODE_SECRET: randomBytes(32).toString("hex"),
    MEETUP_CONFIRMATION_TTL_SECONDS: "900",
  };
  async function run(args: string[]) {
    const verified = await connectTestDatabaseTarget(url);
    try { await assertOwnedDatabase(verified, url, runId); }
    finally { await verified.end(); }
    const child = spawn(process.execPath, args, { env, stdio: "inherit" });
    const [code] = await once(child, "exit");
    if (code !== 0) throw Error("Demo setup subprocess failed.");
  }
  try {
    // Never adopt an existing database. This is the only database this command may modify.
    await admin.query(`CREATE DATABASE "${database}"`);
    owned = true;
    await admin.query(
      `COMMENT ON DATABASE "${database}" IS 'hustlen-mrt-test:${runId}'`,
    );
    const verified = await connectTestDatabaseTarget(url);
    try { await assertOwnedDatabase(verified, url, runId); }
    finally { await verified.end(); }

    await mkdir(`.test-artifacts/${runId}`, { recursive: true });
    await writeFile(
      `.test-artifacts/${runId}/tsconfig.json`,
      JSON.stringify({
        extends: "../../tsconfig.json",
        include: [
          "../../next-env.d.ts",
          "../../app/**/*.ts",
          "../../app/**/*.tsx",
          "../../components/**/*.tsx",
          "../../lib/**/*.ts",
        ],
        exclude: ["../../node_modules"],
      }),
    );
    await run([
      "node_modules/prisma/build/index.js",
      "migrate",
      "deploy",
      "--config",
      "prisma7.config.ts",
    ]);
    await run([
      "node_modules/prisma/build/index.js",
      "db",
      "seed",
      "--config",
      "prisma7.config.ts",
    ]);
    const db = await connectTestDatabaseTarget(url);
    let ids: string;
    try {
      await assertOwnedDatabase(db, url, runId);
      const result = await db.query(
        'SELECT id FROM "User" WHERE email IN ($1,$2) ORDER BY id',
        ["alice@example.test", "bob@example.test"],
      );
      if (result.rows.length !== 2)
        throw Error("Demo participants unavailable.");
      ids = result.rows.map((row) => row.id).join(",");
    } finally {
      await db.end();
    }
    console.log(
      `Disposable demo ${database}; run ${runId}. Stop with Ctrl-C to erase test data. Only Alice and Bob are allowlisted.`,
    );
    app = spawn(
      process.execPath,
      [
        "node_modules/next/dist/bin/next",
        "dev",
        "--hostname",
        "localhost",
        "--port",
        "3000",
      ],
      {
        env: {
          ...env,
          MEETUP_PREVIEW_USER_IDS: ids,
          MEETUP_TEST_LOCATION_USER_IDS: ids,
        },
        stdio: "inherit",
      },
    );
    const stop = () => {
      app?.kill("SIGTERM");
    };
    process.once("SIGINT", stop);
    process.once("SIGTERM", stop);
    try {
      const [code, signal] = await once(app!, "exit");
      if (code !== 0 && signal !== "SIGTERM" && signal !== "SIGINT")
        throw Error("Demo server stopped unexpectedly.");
    } finally {
      process.off("SIGINT", stop);
      process.off("SIGTERM", stop);
    }
  } finally {
    if (app && app.exitCode === null && app.signalCode === null) {
      app.kill("SIGTERM");
      await once(app!, "exit");
    }
    if (owned) {
      const db = await connectTestDatabaseTarget(url);
      try {
        await assertOwnedDatabase(db, url, runId);
        const table = await db.query(
          "SELECT to_regclass('public.\"ListingMedia\"') AS name",
        );
        if (table.rows[0].name) {
          const { rows } = await db.query('SELECT url FROM "ListingMedia"');
          for (const row of rows) {
            const filename = String(row.url).split("/").at(-1)!;
            if (!/^[a-f0-9-]{36}\.(png|jpg|webp|webm|mp4)$/.test(filename))
              continue;
            await unlink(path.resolve("storage/listings", filename)).catch(
              (error) => {
                if (error.code !== "ENOENT") throw error;
              },
            );
          }
        }
      } finally {
        await db.end();
      }
      await admin.query(`DROP DATABASE "${database}" WITH (FORCE)`);
      console.log(
        "Removed this run's owned disposable demo database. Test centres were memory-only.",
      );
    }
    await admin.end();
  }
}
main().catch(() => {
  console.error(
    "Local meetup demo failed; private connection details omitted. Never reset an existing database to retry.",
  );
  process.exitCode = 1;
});
