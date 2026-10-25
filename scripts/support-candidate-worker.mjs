/** Private development worker. Credentials arrive only on a private bootstrap pipe. */
import { createServer } from "node:http";
import { createHash, timingSafeEqual } from "node:crypto";
import { chmod, unlink } from "node:fs/promises";
import { registerHooks, createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import {
  supportStaffConfig,
  assertSupportOwnership,
} from "../lib/support-staff-candidate/config.ts";
import { disposableDatabaseUrl } from "../lib/disposable-database-url.ts";
async function main() {
  if (process.env.NODE_ENV !== "development")
    throw Error("Development worker only");
  let raw = "";
  for await (const chunk of process.stdin) {
    raw += chunk;
    if (raw.length > 12000) throw Error("Bootstrap bound");
  }
  const boot = JSON.parse(raw);
  raw = "";
  if (
    !/^[a-f0-9]{64}$/.test(boot.secret) ||
    boot.socket !== `/tmp/hustlen-support-${process.env.MRT_TEST_RUN_ID}.sock`
  )
    throw Error("Private bootstrap required");
  for (const url of [boot.mfaUrl, boot.supportUrl]) disposableDatabaseUrl(url);
  process.env.DATABASE_URL = boot.mfaUrl;
  process.env.TEST_DATABASE_URL = boot.mfaUrl;
  process.env.MRT_TEST_DATABASE_URL = boot.mfaUrl;
  const config = supportStaffConfig();
  if (
    new URL(boot.supportUrl).pathname !== config.database.pathname ||
    new URL(boot.supportUrl).hostname !== config.database.hostname ||
    new URL(boot.supportUrl).port !== config.database.port
  )
    throw Error("Same owned database required");
  const pool = new Pool({ connectionString: boot.supportUrl, max: 4 });
  await assertSupportOwnership(pool, config);
  // Next's server-only build marker is resolved for this Node server entry only;
  // no verifier, database query or authorization function is replaced/mocked.
  const require = createRequire(path.join(process.cwd(), "package.json")),
    empty = pathToFileURL(
      path.join(
        path.dirname(require.resolve("next/package.json")),
        "dist/compiled/server-only/empty.js",
      ),
    ).href;
  registerHooks({
    resolve(specifier, context, next) {
      return next(specifier === "server-only" ? empty : specifier, context);
    },
  });
  const mfaDb = new PrismaClient({
    adapter: new PrismaPg({ connectionString: boot.mfaUrl }),
  });
  const auditRights = (
    await pool.query(
      `SELECT current_user actor,NOT(r.rolsuper OR r.rolcreaterole OR r.rolcreatedb OR r.rolbypassrls OR has_schema_privilege(current_user,'public','CREATE') OR has_schema_privilege(current_user,'hustlen_support_candidate','CREATE') OR has_table_privilege(current_user,'public."SupportMessage"','SELECT') OR has_table_privilege(current_user,'hustlen_support_candidate.reply','SELECT') OR has_table_privilege(current_user,'hustlen_support_candidate.audit','INSERT') OR has_table_privilege(current_user,'public."StaffMfaAssurance"','INSERT')) AND has_function_privilege(current_user,'hustlen_support_candidate.staff_request(text,jsonb)','EXECUTE') safe FROM pg_roles r WHERE rolname=current_user`,
    )
  ).rows[0];
  const mfaRights = (
    await mfaDb.$queryRawUnsafe(
      `SELECT current_user actor,NOT(r.rolsuper OR r.rolcreaterole OR r.rolcreatedb OR r.rolbypassrls OR has_schema_privilege(current_user,'public','CREATE') OR has_table_privilege(current_user,'hustlen_support_candidate.audit','INSERT') OR has_table_privilege(current_user,'hustlen_support_candidate.reply','SELECT') OR has_table_privilege(current_user,'public."StaffMembership"','INSERT')) AND has_table_privilege(current_user,'public."StaffMfaAssurance"','INSERT') safe FROM pg_roles r WHERE rolname=current_user`,
    )
  )[0];
  if (
    !auditRights?.safe ||
    !mfaRights?.safe ||
    auditRights.actor === mfaRights.actor
  )
    throw Error("Separate restricted Support worker principals required");
  const { supportWorkerService } =
    await import("../lib/support-staff-candidate/service.ts");
  const service = supportWorkerService(mfaDb, pool, config),
    digest = (s) => createHash("sha256").update(s).digest();
  const server = createServer(async (req, res) => {
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("Content-Type", "application/json");
    if (
      req.method !== "POST" ||
      req.url !== "/command" ||
      !timingSafeEqual(
        digest(req.headers.authorization ?? ""),
        digest("Bearer " + boot.secret),
      )
    ) {
      res.writeHead(403).end('{"error":"Pilot denied"}');
      return;
    }
    try {
      let length = 0;
      const chunks = [];
      for await (const chunk of req) {
        length += chunk.length;
        if (length > 32768) throw Error("Body bound");
        chunks.push(chunk);
      }
      const parsed = JSON.parse(Buffer.concat(chunks).toString());
      if (
        !parsed ||
        Object.keys(parsed).some((k) => !["token", "body"].includes(k)) ||
        typeof parsed.token !== "string" ||
        !parsed.body ||
        typeof parsed.body !== "object"
      )
        throw Error("Closed command required");
      const result = await service(parsed.token, parsed.body);
      res.end(JSON.stringify(result));
    } catch (error) {
      const { logOperationalError } =
        await import("../lib/operational-error.ts");
      logOperationalError("support_candidate.worker", error);
      res.writeHead(403).end('{"error":"Scoped pilot request denied"}');
    }
  });
  await new Promise((resolve) => server.listen(boot.socket, resolve));
  await chmod(boot.socket, 0o600);
  process.stdout.write("SUPPORT_WORKER_READY\n");
  const stop = () => {
    server.close(async () => {
      await pool.end();
      await mfaDb.$disconnect();
      await unlink(boot.socket).catch(() => {});
      process.exit(0);
    });
  };
  process.on("SIGTERM", stop);
  process.on("SIGINT", stop);
}
main().catch(() => {
  process.stderr.write(
    "Support worker unavailable; private bootstrap omitted\n",
  );
  process.exitCode = 1;
});
