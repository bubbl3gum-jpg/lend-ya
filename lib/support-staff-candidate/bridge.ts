import "server-only";
import { cookies } from "next/headers";
import { request as httpRequest } from "node:http";
import { Pool } from "pg";
import { prisma } from "../prisma";
import { getCurrentUser } from "../auth";
import { apiError, readJsonObject } from "../api-response";
import { logOperationalError } from "../operational-error";
import { supportCommand } from "./commands";
import { supportStaffConfig, assertSupportOwnership } from "./config";
import { scopedSupportService } from "./service";
let pool: Pool | undefined;
export async function ownedSupportRuntime() {
  const c = supportStaffConfig();
  await assertSupportOwnership(
    {
      query: async (sql, values) => ({
        rows: await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
          sql,
          ...(values ?? []),
        ),
      }),
    },
    c,
  );
  const r = await prisma.$queryRaw<
    { safe: boolean }[]
  >`SELECT NOT(r.rolsuper OR r.rolcreaterole OR r.rolcreatedb OR r.rolbypassrls OR has_schema_privilege(current_user,'public','CREATE') OR has_schema_privilege(current_user,'hustlen_support_candidate','CREATE') OR has_table_privilege(current_user,'public."SupportMessage"','SELECT') OR has_table_privilege(current_user,'hustlen_support_candidate.reply','SELECT') OR has_table_privilege(current_user,'hustlen_support_candidate.audit','INSERT') OR has_table_privilege(current_user,'public."StaffMfaAssurance"','INSERT') OR has_any_column_privilege(current_user,'public."AuthSession"','INSERT') OR has_any_column_privilege(current_user,'public."AuthSession"','UPDATE') OR has_column_privilege(current_user,'public."User"','passwordHash','UPDATE')) safe FROM pg_roles r WHERE rolname=current_user`;
  if (r[0]?.safe !== true) throw Error("Restricted candidate runtime required");
  return c;
}
export async function staffWorkerCommand(
  token: string,
  body: unknown,
  c: ReturnType<typeof supportStaffConfig>,
) {
  const secret = process.env.HUSTLEN_SUPPORT_STAFF_CHANNEL_KEY,
    socket = process.env.HUSTLEN_SUPPORT_STAFF_SOCKET;
  if (
    !secret ||
    !/^[a-f0-9]{64}$/.test(secret) ||
    socket !== `/tmp/hustlen-support-${c.runId}.sock`
  )
    throw Error("Private worker unavailable");
  return new Promise<unknown>((resolve, reject) => {
    const req = httpRequest(
      {
        socketPath: socket,
        path: "/command",
        method: "POST",
        headers: {
          Authorization: "Bearer " + secret,
          "Content-Type": "application/json",
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        let bytes = 0;
        res.on("data", (b) => {
          bytes += b.length;
          if (bytes > 131072) req.destroy(Error("Response bound"));
          else chunks.push(b);
        });
        res.on("end", () => {
          try {
            if (res.statusCode !== 200) throw Error("Scoped access denied");
            resolve(JSON.parse(Buffer.concat(chunks).toString()));
          } catch {
            reject(Error("Scoped Support access denied or unavailable."));
          }
        });
        res.on("error", reject);
      },
    );
    req.on("error", reject);
    req.setTimeout(5000, () => req.destroy(Error("Worker unavailable")));
    req.end(JSON.stringify({ token, body }));
  });
}
export async function supportCandidateApi(
  request: Request,
  kind: "staff" | "requester",
) {
  let status = 403;
  let response: Response;
  try {
    let config;
    try {
      config = await ownedSupportRuntime();
    } catch {
      status = 404;
      throw Error("Candidate unavailable");
    }
    if (
      request.method !== "POST" ||
      request.headers.get("origin") !== config.origin ||
      request.headers.get("host") !== new URL(config.origin).host ||
      request.headers.get("sec-fetch-site") === "cross-site" ||
      request.headers.get("content-type") !== "application/json"
    )
      throw Error("Exact same-origin JSON required");
    if (new URL(request.url).search) {
      status = 400;
      throw Error("No query selectors");
    }
    const user = await getCurrentUser();
    if (!user) {
      status = 401;
      throw Error("Authentication required");
    }
    if (user.accountStatus !== "ACTIVE") throw Error("Account unavailable");
    const token = (await cookies()).get("p2p_session")?.value;
    if (!token) {
      status = 401;
      throw Error("Authentication required");
    }
    const body = await readJsonObject(request);
    let parsed;
    try {
      parsed = supportCommand(body, kind);
    } catch {
      status = 400;
      throw Error("Invalid closed command");
    }
    if (kind === "staff" && user.role !== "USER")
      throw Error("Synthetic Support identity required");
    if (!pool)
      pool = new Pool({ connectionString: config.database.toString(), max: 4 });
    const result =
      kind === "staff"
        ? await staffWorkerCommand(token, parsed, config)
        : await scopedSupportService(pool, "requester", config)(token, parsed);
    response = Response.json(result);
  } catch (error) {
    logOperationalError("support_candidate.http", error);
    response = apiError(
      status === 404
        ? "Not found."
        : status === 401
          ? "Authentication required."
          : status === 400
            ? "Invalid candidate request."
            : "Scoped Support access denied or unavailable.",
      status,
    );
  }
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Vary", "Cookie");
  return response;
}
