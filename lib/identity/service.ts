import "server-only";
import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "../prisma";
import { getCurrentUser } from "../auth";
import { disposableDatabaseUrl } from "../disposable-database-url";
import { readJsonObject } from "../api-response";
import { logOperationalError } from "../operational-error";
import { commandInput } from "./contracts";
import { SyntheticIdentityStore, SimulationError } from "./simulation";
export function identityEnabled() { return process.env.NODE_ENV === "development" && process.env.HUSTLEN_IDENTITY_CANDIDATE === "owned-synthetic-only"; }
class IdentityDenied extends Error { constructor(public status: number) { super("Identity candidate unavailable"); } }
const shared = globalThis as typeof globalThis & { identity13c?: SyntheticIdentityStore };
function store() { return shared.identity13c ??= new SyntheticIdentityStore(); }
export async function identityActor() {
  if (!identityEnabled()) throw new IdentityDenied(404);
  const env = process.env;
  if (!/^[a-f0-9]{24}$/.test(env.MRT_TEST_RUN_ID ?? "") || env.DATABASE_URL !== env.TEST_DATABASE_URL || env.DATABASE_URL !== env.MRT_TEST_DATABASE_URL) throw new IdentityDenied(404);
  const target = disposableDatabaseUrl(env.DATABASE_URL);
  const rows = await prisma.$queryRaw<{ name: string; marker: string }[]>`SELECT current_database() name,shobj_description(oid,'pg_database') marker FROM pg_database WHERE datname=current_database()`;
  if (rows[0]?.name !== target.pathname.slice(1) || rows[0]?.marker !== `hustlen-mrt-test:${env.MRT_TEST_RUN_ID}`) throw new IdentityDenied(404);
  const user = await getCurrentUser();
  if (!user) throw new IdentityDenied(401);
  // Existing suspended rental/support obligations remain untouched; this optional simulator is ACTIVE-only.
  if (user.accountStatus !== "ACTIVE") throw new IdentityDenied(403);
  const token = (await cookies()).get("p2p_session")?.value;
  if (!token) throw new IdentityDenied(401);
  const session = await prisma.authSession.findUnique({ where: { tokenHash: createHash("sha256").update(token).digest("hex") }, select: { id: true, userId: true, expiresAt: true } });
  if (!session || session.userId !== user.id || session.expiresAt <= new Date()) throw new IdentityDenied(401);
  // Internal key never returned or logged; names, documents, biometrics are never collected.
  return { userId: user.id, key: `${env.MRT_TEST_RUN_ID}:${user.id}:${session.id}` };
}
export async function identitySummary() { const actor = await identityActor(); return store().read(actor.key); }
async function purposeFor(bookingId: number, userId: number) {
  const b = await prisma.booking.findFirst({ where: { id: bookingId, OR: [{ ownerId: userId }, { renterId: userId }] }, select: { status: true } });
  if (!b) throw new IdentityDenied(404);
  if (b.status === "HANDOFF_PENDING") return "PICKUP" as const;
  if (b.status === "RETURN_PENDING") return "RETURN" as const;
  throw new IdentityDenied(409);
}
const reply = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "private, no-store", Vary: "Cookie", "X-Content-Type-Options": "nosniff" } });
export async function identityApi(request: Request) {
  try {
    const actor = await identityActor();
    if (new URL(request.url).search) throw new IdentityDenied(400);
    if (request.method === "GET") return reply(store().read(actor.key));
    const origin = process.env.HUSTLEN_IDENTITY_ORIGIN;
    if (!origin || new URL(origin).hostname !== "localhost" || new URL(origin).origin !== origin || new URL(request.url).origin !== origin || request.headers.get("origin") !== origin || request.headers.get("x-hustlen-identity") !== "1" || request.headers.get("sec-fetch-site") === "cross-site") throw new IdentityDenied(403);
    if (request.headers.get("content-type") !== "application/json") throw new IdentityDenied(400);
    let command;
    try { command = commandInput(await readJsonObject(request)); } catch { throw new IdentityDenied(400); }
    const current = store().read(actor.key);
    const bookingId = command.action === "CHALLENGE" ? command.bookingId : command.action === "COMPLETE_CHALLENGE" ? current.challenge?.bookingId : null;
    const purpose = bookingId ? await purposeFor(bookingId, actor.userId) : null;
    const final = await identityActor();
    if (final.key !== actor.key) throw new IdentityDenied(401);
    return reply(store().apply(actor.key, command, purpose));
  } catch (e) {
    if (e instanceof IdentityDenied) return reply({ code: e.status === 401 ? "SESSION" : e.status === 409 ? "CONFLICT" : "UNAVAILABLE" }, e.status);
    if (e instanceof SimulationError) return reply({ code: e.code }, e.status);
    logOperationalError("identity_synthetic", e);
    return reply({ code: "UNAVAILABLE" }, 503);
  }
}
