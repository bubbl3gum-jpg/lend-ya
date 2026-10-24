import { logOperationalError } from "../lib/operational-error";
import "dotenv/config";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdir, appendFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import net from "node:net";
import {
  testDatabaseUrl,
  testRunId,
  assertOwnedDatabase,
  connectTestDatabaseTarget,
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
  const admin = await connectTestDatabaseTarget(url, true);
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
  async function run(args: string[]): Promise<void> {
    const verified = await connectTestDatabaseTarget(url);
    try { await assertOwnedDatabase(verified, url, runId); }
    finally { await verified.end(); }
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
    const verified = await connectTestDatabaseTarget(url);
    try { await assertOwnedDatabase(verified, url, runId); }
    finally { await verified.end(); }

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
    if(process.argv.includes("--investigation-receipt")) env.MRT_TEST_INVESTIGATION_RECEIPT_ONLY="1";
    if(process.argv.includes("--meetup-camera")) env.MRT_TEST_CAMERA_ONLY="1";
    const legacyGroup = [
      "meetup-camera",
      "investigation-receipt",
      "staff-read-pilot",
      "database-principals",
      "mfa-migration",
      "mfa",
      "execution-rehearsal",
      "approval-migration",
      "approval",
      "staff-session-migration",
      "staff-session",
      "scoped-reads",
      "staff-migration",
      "staff-schema",
      "meetup-migration",
      "meetup",
      "chat",
      "admin",
      "moderation",
      "mvp",
      "rental-browser",
      "admin-migration",
    ].find((group) => process.argv.includes(`--${group}`));
    const standalone = legacyGroup
      ? {
          "meetup-camera": "tests/meetup.integration.test.ts",
          "investigation-receipt": "tests/meetup.integration.test.ts",
          "staff-read-pilot": "tests/staff-read-pilot.integration.test.ts",
          "database-principals": "tests/database-principals.test.ts",
          "mfa-migration": "tests/mfa-migration.test.ts",
          "mfa": "tests/mfa.test.ts",
          "execution-rehearsal": "tests/execution-rehearsal.test.ts",
          "approval-migration": "tests/approval-migration.test.ts",
          "approval": "tests/approval.test.ts",
          "staff-session-migration": "tests/staff-session-migration.test.ts",
          "staff-session": "tests/staff-session.test.ts",
          "scoped-reads": "tests/scoped-reads.test.ts",
          "staff-migration": "tests/staff-migration.test.ts",
          "staff-schema": "tests/staff-schema.test.ts",
          "meetup-migration": "tests/meetup-migration.test.ts",
          meetup: "tests/meetup.integration.test.ts",
          chat: "tests/chat.integration.test.ts",
          admin: "tests/admin.integration.test.ts",
          moderation: "tests/moderation.integration.test.ts",
          mvp: "tests/mvp-security.test.ts",
          "rental-browser": "tests/rental-browser.test.ts",
          "admin-migration": "tests/moderation-migration.test.ts",
        }[legacyGroup]
      : undefined;
    const testPort = await freePort();
    for (const variable of [
      "TEST_MEETUP_PORT",
      "TEST_CHAT_PORT",
      "TEST_ADMIN_PORT",
      "TEST_MODERATION_PORT",
      "TEST_MVP_PORT",
      "TEST_BROWSER_PORT",
    ])
      env[variable] = String(testPort);
    if (process.argv.includes("--migration"))
      await run(["node_modules/tsx/dist/cli.mjs", "tests/mrt-migration.ts"]);
    else {
      if (!["admin-migration","meetup-migration","staff-migration","staff-session-migration","approval-migration","mfa-migration"].includes(legacyGroup??""))
        await run([
          "node_modules/prisma/build/index.js",
          "migrate",
          "deploy",
          "--config",
          "prisma7.config.ts",
        ]);
      if(process.argv.includes("--build")) {await run(["node_modules/next/dist/bin/next","build"]);} else if (standalone) {
        if (legacyGroup === "mvp") await run(["node_modules/next/dist/bin/next", "build"]);
        if (["scoped-reads","staff-session","approval","execution-rehearsal","mfa","database-principals"].includes(legacyGroup??""))
          await run(["--import", "./tests/support/server-boundary-loader.mjs", "--import", "tsx", "--test", standalone]);
        else await run(["node_modules/tsx/dist/cli.mjs", "--test", standalone]);
      } else {
        const port = await freePort();
        env.MRT_TEST_URL = `http://localhost:${port}`;
        env.TEST_BASE_URL = env.MRT_TEST_URL;
        if (process.argv.some(flag => ["--mfa-pilot","--mfa-pilot-production"].includes(flag))) {
          env.HUSTLEN_PASSKEY_PILOT = "owned-development-only";
          env.HUSTLEN_STAFF_READ_PILOT = "owned-synthetic-only";
          env.HUSTLEN_STAFF_READ_ORIGIN = env.TEST_BASE_URL;
          env.HUSTLEN_PASSKEY_PILOT_ORIGIN = env.TEST_BASE_URL;
        }
        if (process.argv.includes("--mfa-pilot-disabled")) env.HUSTLEN_PASSKEY_PILOT = "disabled";
        const productionPilot = process.argv.includes("--mfa-pilot-production");
        if (productionPilot) {
          await run(["node_modules/next/dist/bin/next", "build"]);
          Object.assign(env, { NODE_ENV: "production" });
        }
        app = spawn(
          process.execPath,
          [
            "node_modules/next/dist/bin/next",
            productionPilot ? "start" : "dev",
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
        if (process.argv.includes("--mfa-pilot") || process.argv.includes("--mfa-pilot-disabled") || productionPilot)
          await run(["node_modules/tsx/dist/cli.mjs", "--test", (productionPilot || process.argv.includes("--mfa-pilot-disabled")) ? "tests/mfa-pilot-production.test.ts" : "tests/mfa-pilot.integration.test.ts"]);
        else if (process.argv.includes("--workbench"))
          await run(["node_modules/tsx/dist/cli.mjs", "--test", "tests/admin-workbench.integration.test.ts"]);
        else if (process.argv.includes("--admin-own-session"))
          await run(["node_modules/tsx/dist/cli.mjs", "--test", "tests/admin-own-session.integration.test.ts"]);
        else if (process.argv.includes("--login-navigation"))
          await run(["node_modules/tsx/dist/cli.mjs", "--test", "tests/login-navigation.integration.test.ts"]);
        else if (process.argv.includes("--auth-login-readiness"))
          await run(["node_modules/tsx/dist/cli.mjs", "--test", "tests/auth-login-readiness.integration.test.ts"]);
        else if (process.argv.includes("--authorization"))
          await run(["--import", "./tests/support/server-boundary-loader.mjs", "--import", "tsx", "--test", "tests/authorization.integration.test.ts"]);
        else if (process.argv.includes("--stability"))
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
        const client = await connectTestDatabaseTarget(url);
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
  logOperationalError("test.isolated", error);
  process.exitCode = 1;
});
