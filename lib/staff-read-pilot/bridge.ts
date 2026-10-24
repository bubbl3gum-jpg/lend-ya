import "server-only";
import { request as httpRequest } from "node:http";
import { cookies } from "next/headers";
import { prisma } from "../prisma";
import { apiError, readJsonObject } from "../api-response";
import { getCurrentUser } from "../auth";
import { logOperationalError } from "../operational-error";
import { staffReadPilotConfig, assertStaffReadOwnership } from "./config";
export async function ownedStaffReadPilot() {
  const config = staffReadPilotConfig();
  await assertStaffReadOwnership(
    {
      query: async (sql, values) => ({
        rows: await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
          sql,
          ...(values ?? []),
        ),
      }),
    },
    config,
  );
  const rights = await prisma.$queryRaw<
    { safe: boolean }[]
  >`SELECT NOT (r.rolsuper OR r.rolcreaterole OR r.rolcreatedb OR r.rolbypassrls OR has_schema_privilege(current_user,'public','CREATE') OR has_table_privilege(current_user,'public."StaffMfaAssurance"','INSERT') OR has_table_privilege(current_user,(SELECT c.oid FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='hustlen_staff_read_fixture' AND c.relname='audit'),'INSERT')) AS safe FROM pg_roles r WHERE rolname=current_user`;
  if (rights[0]?.safe !== true)
    throw Error("Restricted app principal required");
  return config;
}
export async function staffReadPilotRequest(request: Request) {
  let config;
  try {
    config = await ownedStaffReadPilot();
  } catch {
    return apiError("Not found.", 404);
  }
  if (
    request.method !== "POST" ||
    request.headers.get("origin") !== config.origin ||
    request.headers.get("host") !== new URL(config.origin).host ||
    request.headers.get("sec-fetch-site") === "cross-site" ||
    request.headers.get("content-type") !== "application/json"
  )
    return apiError("Exact same-origin JSON required.", 403);
  if (new URL(request.url).search)
    return apiError("No query selectors accepted.", 400);
  let user;
  try {
    user = await getCurrentUser();
  } catch (error) {
    logOperationalError("staff_read_pilot.authentication", error);
    return apiError("Authentication unavailable.", 503);
  }
  if (!user) return apiError("Authentication required.", 401);
  if (user.role !== "USER" || user.accountStatus !== "ACTIVE")
    return apiError("Synthetic Operations fixture required.", 403);
  const token = (await cookies()).get("p2p_session")?.value,
    body = await readJsonObject(request);
  if (
    !token ||
    !body ||
    ![
      "enroll.begin",
      "enroll.finish",
      "verify.begin",
      "verify.finish",
      "read",
    ].includes(String(body.action))
  )
    return apiError("Invalid pilot command.", 400);
  const keys =
    body.action === "read"
      ? ["action", "listingId", "bindingId"]
      : body.action === "enroll.begin"
        ? ["action", "password"]
        : body.action === "enroll.finish"
          ? ["action", "password", "challengeId", "response"]
          : body.action === "verify.begin"
            ? ["action"]
            : ["action", "challengeId", "response"];
  if (Object.keys(body).some((k) => !keys.includes(k)))
    return apiError("Unknown pilot fields.", 400);
  const secret = process.env.HUSTLEN_STAFF_READ_CHANNEL_KEY,
    socket = process.env.HUSTLEN_STAFF_READ_SOCKET;
  if (
    !secret ||
    !/^[a-f0-9]{64}$/.test(secret) ||
    socket !== `/tmp/hustlen-read-${config.runId}.sock`
  )
    return apiError("Private worker unavailable.", 503);
  try {
    const result = await new Promise<{ status: number; body: unknown }>(
      (resolve, reject) => {
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
            let size = 0;
            res.on("data", (chunk) => {
              size += chunk.length;
              if (size > 32768) {
                req.destroy();
                reject(Error("Response bound"));
              } else chunks.push(chunk);
            });
            res.on("end", () => {
              try {
                resolve({
                  status: res.statusCode ?? 503,
                  body: JSON.parse(Buffer.concat(chunks).toString()),
                });
              } catch {
                reject(Error("Worker response unavailable"));
              }
            });
            res.on("error", reject);
          },
        );
        req.on("error", reject);
        req.setTimeout(2600, () => req.destroy(Error("Worker timeout")));
        req.end(JSON.stringify({ token, body }));
      },
    );
    if (result.status !== 200)
      return apiError("Scoped pilot request denied.", 403);
    const response = Response.json(result.body);
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("Vary", "Cookie");
    response.headers.set("X-Hustlen-Identity", "OWNED_SYNTHETIC_HUMAN");
    return response;
  } catch {
    return apiError("Private worker unavailable.", 503);
  }
}
