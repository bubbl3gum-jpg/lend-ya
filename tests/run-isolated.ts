import "dotenv/config";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdir, appendFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import net from "node:net";
import { Client } from "pg";
import {
  testDatabaseUrl,
  testRunId,
  assertOwnedDatabase,
} from "./support/test-database";

async function freePort(): Promise<number> {
  const server = net.createServer();
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "localhost", resolve);
  });
  const port = (server.address() as net.AddressInfo).port;
  await new Promise<void>((resolve) => server.close(() => resolve()));
  return port;
}
async function main() {
  const url = testDatabaseUrl(
    process.env.MRT_TEST_DATABASE_URL,
    process.env.DATABASE_URL,
  );
  const database = url.pathname.slice(1),
    runId = testRunId();
  const artifactDir = path.resolve(".test-artifacts", runId);
  await mkdir(artifactDir, { recursive: true });
  const adminUrl = new URL(url);
  adminUrl.pathname = "/postgres";
  adminUrl.searchParams.delete("schema");
  const admin = new Client({ connectionString: adminUrl.toString() });
  await admin.connect();
  let owned = false,
    failed = true,
    app: ChildProcess | undefined;
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    DATABASE_URL: url.toString(),
    MRT_TEST_DATABASE_URL: url.toString(),
    MRT_TEST_RUN_ID: runId,
    MRT_TEST_ARTIFACT_DIR: artifactDir,
    TEST_DATABASE_URL: url.toString(),
    CHROMIUM_PATH: process.env.MRT_BROWSER_PATH ?? process.env.CHROMIUM_PATH,
  };
  function run(args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const child = spawn(process.execPath, args, {
        env,
        stdio: ["ignore", "pipe", "pipe"],
      });
      child.stdout?.on("data", (d) => process.stdout.write(d));
      child.stderr?.on("data", (d) => process.stderr.write(d));
      child.on("error", () =>
        reject(new Error("Test subprocess could not start.")),
      );
      child.on("exit", (code) =>
        code === 0
          ? resolve()
          : reject(new Error(`Test subprocess failed (exit ${code}).`)),
      );
    });
  }
  try {
    // CREATE fails if the requested database already exists. Never adopt, reset or drop it.
    await admin.query(`CREATE DATABASE "${database}"`);
    owned = true;
    await admin.query(
      `COMMENT ON DATABASE "${database}" IS 'hustlen-mrt-test:${runId}'`,
    );
    console.log(
      `Isolated database: ${database}; artifacts: ${path.relative(process.cwd(), artifactDir)}`,
    );
    await writeFile(
      path.join(artifactDir, "tsconfig.json"),
      JSON.stringify(
        {
          extends: "../../tsconfig.json",
          include: [
            "../../next-env.d.ts",
            "../../app/**/*.ts",
            "../../app/**/*.tsx",
            "../../components/**/*.tsx",
            "../../lib/**/*.ts",
          ],
          exclude: ["../../node_modules"],
        },
        null,
        2,
      ) + "\n",
    );
    const legacyGroup = [
      "admin",
      "moderation",
      "mvp",
      "rental-browser",
      "admin-migration",
    ].find((group) => process.argv.includes(`--${group}`));
    const standalone = legacyGroup
      ? {
          admin: "tests/admin.integration.test.ts",
          moderation: "tests/moderation.integration.test.ts",
          mvp: "tests/mvp-security.test.ts",
          "rental-browser": "tests/rental-browser.test.ts",
          "admin-migration": "tests/moderation-migration.test.ts",
        }[legacyGroup]
      : undefined;
    const testPort = await freePort();
    for (const variable of [
      "TEST_ADMIN_PORT",
      "TEST_MODERATION_PORT",
      "TEST_MVP_PORT",
      "TEST_BROWSER_PORT",
    ])
      env[variable] = String(testPort);
    if (process.argv.includes("--migration"))
      await run(["node_modules/tsx/dist/cli.mjs", "tests/mrt-migration.ts"]);
    else {
      if (legacyGroup !== "admin-migration")
        await run([
          "node_modules/prisma/build/index.js",
          "migrate",
          "deploy",
          "--config",
          "prisma7.config.ts",
        ]);
      if(process.argv.includes("--build")) {await run(["node_modules/next/dist/bin/next","build"]);} else if (standalone) {
        if (legacyGroup === "mvp") await run(["node_modules/next/dist/bin/next", "build"]);
        await run(["node_modules/tsx/dist/cli.mjs", "--test", standalone]);
      } else {
        const port = await freePort();
        env.MRT_TEST_URL = `http://localhost:${port}`;
        env.TEST_BASE_URL = env.MRT_TEST_URL;
        app = spawn(
          process.execPath,
          [
            "node_modules/next/dist/bin/next",
            "dev",
            "--hostname",
            "localhost",
            "--port",
            String(port),
          ],
          { env, stdio: ["ignore", "pipe", "pipe"] },
        );
        let stopped = false;
        app.on("exit", () => {
          stopped = true;
        });
        app.on("error", () => {
          stopped = true;
        });
        app.stdout?.on("data", (d) => {
          void appendFile(path.join(artifactDir, "server.log"), d);
        });
        app.stderr?.on("data", (d) => {
          void appendFile(path.join(artifactDir, "server.log"), d);
        });
        let ready = false;
        for (let i = 0; i < 200; i++) {
          if (stopped)
            throw Error("Isolated app stopped; inspect the test server.log.");
          try {
            const response = await fetch(`${env.MRT_TEST_URL}/api/auth/me`);
            if (response.status === 401) {
              ready = true;
              break;
            }
          } catch {}
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
        if (!ready)
          throw Error("Isolated app did not become ready; inspect server.log.");
        if (process.argv.includes("--stability"))
          await run(["node_modules/tsx/dist/cli.mjs", "--test", "tests/core-stability.integration.test.ts"]);
        else if (process.argv.includes("--rental-api"))
          await run([
            "node_modules/tsx/dist/cli.mjs",
            "--test",
            "--test-concurrency=1",
            "tests/bookings.integration.test.ts",
            "tests/rental-lifecycle.integration.test.ts",
          ]);
        else
          await run([
            "node_modules/tsx/dist/cli.mjs",
            "tests/mrt-integration.ts",
          ]);
      }
    }
    failed = false;
  } finally {
    try {
      if (app && app.exitCode === null) {
        const exited = new Promise<void>((resolve) =>
          app!.once("exit", () => resolve()),
        );
        app.kill("SIGTERM");
        await Promise.race([
          exited,
          new Promise<void>((resolve) => setTimeout(resolve, 5000)),
        ]);
        if (app.exitCode === null) {
          app.kill("SIGKILL");
          await exited;
        }
      }
      if (owned && !(failed && process.env.MRT_TEST_KEEP_ON_FAILURE === "1")) {
        const client = new Client({ connectionString: url.toString() });
        await client.connect();
        try {
          await assertOwnedDatabase(client, url, runId);
          const table = await client.query(
            "SELECT to_regclass('public.\"ListingMedia\"') AS name",
          );
          if (table.rows[0].name) {
            const { rows } = await client.query(
              'SELECT url FROM "ListingMedia"',
            );
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
          await client.end();
        }
        await admin.query(`DROP DATABASE "${database}"`);
        console.log(
          `Removed owned test database ${database} and its recorded uploads.`,
        );
      } else if (owned)
        console.log(
          `Failed fixtures preserved in ${database}; artifacts: ${artifactDir}. No automatic cleanup requested.`,
        );
    } catch (error) {
      failed = true;
      throw error;
    } finally {
      await admin.end();
      await writeFile(
        path.join(artifactDir, "run.json"),
        JSON.stringify(
          {
            runId,
            database,
            passed: !failed,
            preserved:
              owned && failed && process.env.MRT_TEST_KEEP_ON_FAILURE === "1",
          },
          null,
          2,
        ) + "\n",
      );
    }
  }
}
main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : "Isolated tests failed.",
  );
  process.exitCode = 1;
});
