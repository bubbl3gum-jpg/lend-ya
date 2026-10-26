import "server-only";
import { Client } from "pg";
import { cookies } from "next/headers";
import { createHash, randomBytes } from "node:crypto";
import { prisma } from "../prisma";
import { AdminInputError } from "../admin/auth";
import { requireLocationsAdmin } from "../admin/locations";
import { geofencingLabConfig } from "./config";
import {
  createLab,
  requireLab,
  closeLab,
  setLabCentre,
  labStatus,
  type Binding,
  type Lab,
} from "./store";
import { network } from "../mrt/network";
import { evaluateLocation, locationSettings } from "../meetup/location";
import { apiError, internalServerError, readJsonObject } from "../api-response";
const cookieName = "hustlen_geofencing_lab_browser",
  cookiePath = "/api/admin/locations/lab";
const hash = (s: string) => createHash("sha256").update(s).digest("hex");
export async function labContext() {
  let c;
  try {
    c = geofencingLabConfig();
  } catch {
    throw new AdminInputError("Lab unavailable.", 404);
  }
  const driver = new Client({ connectionString: c.database.toString() });
  if (
    driver.host !== c.database.hostname ||
    driver.port !== Number(c.database.port) ||
    driver.database !== c.database.pathname.slice(1)
  )
    throw new AdminInputError("Lab unavailable.", 404);
  const db = await prisma.$queryRaw<
    { name: string; marker: string }[]
  >`SELECT current_database() name,shobj_description(oid,'pg_database') marker FROM pg_database WHERE datname=current_database()`;
  if (
    db[0]?.name !== driver.database ||
    db[0]?.marker !== `hustlen-mrt-test:${c.runId}`
  )
    throw new AdminInputError("Lab unavailable.", 404);
  const user = await requireLocationsAdmin();
  if (!c.adminIds.includes(user.id))
    throw new AdminInputError("Lab tester unavailable.", 403);
  const jar = await cookies(),
    token = jar.get("p2p_session")?.value;
  if (!token) throw new AdminInputError("Authentication required.", 401);
  const session = await prisma.authSession.findUnique({
    where: { tokenHash: hash(token) },
    select: { createdAt: true, expiresAt: true, userId: true },
  });
  if (!session || session.userId !== user.id || session.expiresAt <= new Date())
    throw new AdminInputError("Authentication required.", 401);
  return {
    config: c,
    user,
    jar,
    binding: {
      userId: user.id,
      sessionHash: hash(token),
      sessionBorn: session.createdAt.toISOString(),
      deviceHash: hash(jar.get(cookieName)?.value ?? "missing"),
    } satisfies Binding,
  };
}
const fields = (body: Record<string, unknown>, allowed: string[]) => {
  if (Object.keys(body).some((k) => !allowed.includes(k)))
    throw new AdminInputError("Unknown Lab fields.");
};
const seconds = (v: unknown) => {
  if (typeof v !== "number" || !Number.isInteger(v) || v < 1 || v > 3600)
    throw new AdminInputError("Choose a duration of 1–3600 seconds.");
  return v;
};
async function audit(
  uid: number,
  action: string,
  state: Record<string, string | boolean | number | null>,
) {
  await prisma.adminAuditLog.create({
    data: {
      adminId: uid,
      action,
      targetType: "GEOFENCING_LAB",
      targetId: uid,
      reason: "Owned self-device test only; never booking arrival.",
      previousState: {},
      newState: state,
    },
  });
}
function own(id: unknown, b: Binding) {
  if (typeof id !== "string" || !/^[a-f0-9-]{36}$/.test(id))
    throw new AdminInputError("Lab unavailable.", 404);
  try {
    return requireLab(id, b);
  } catch {
    throw new AdminInputError("Lab unavailable.", 404);
  }
}
export async function labApi(request: Request, operation: string) {
  let response: Response;
  try {
    const ctx = await labContext();
    if (
      request.method !== "POST" ||
      request.headers.get("origin") !== ctx.config.origin ||
      request.headers.get("host") !== new URL(ctx.config.origin).host ||
      request.headers.get("sec-fetch-site") === "cross-site" ||
      request.headers.get("content-type") !== "application/json"
    )
      throw new AdminInputError("Exact same-origin JSON required.", 403);
    if (new URL(request.url).search)
      throw new AdminInputError("No Lab query selectors.");
    const body = await readJsonObject(request);
    if (!body) throw new AdminInputError("Invalid Lab request.");
    let lab: Lab;
    if (operation === "start") {
      fields(body, ["consent", "durationSeconds"]);
      if (body.consent !== true)
        throw new AdminInputError(
          "Explicit self-device test consent required.",
        );
      const duration = seconds(body.durationSeconds),
        device = randomBytes(32).toString("base64url");
      await audit(ctx.user.id, "MRT_LAB_STARTED", {
        classification: "TEST_LOCATION",
        durationSeconds: duration,
        consent: true,
      });
      lab = createLab({ ...ctx.binding, deviceHash: hash(device) }, duration);
      ctx.jar.set(cookieName, device, {
        httpOnly: true,
        secure: false,
        sameSite: "strict",
        path: cookiePath,
        maxAge: duration,
      });
      response = Response.json(labStatus(lab));
    } else {
      lab = own(body.labId, ctx.binding);
      if (operation === "status") {
        fields(body, ["labId"]);
        response = Response.json(labStatus(lab));
      } else if (operation === "revoke") {
        fields(body, ["labId"]);
        closeLab(lab.id);
        ctx.jar.set(cookieName, "", {
          httpOnly: true,
          sameSite: "strict",
          path: cookiePath,
          maxAge: 0,
        });
        await audit(ctx.user.id, "MRT_LAB_REVOKED", {
          classification: "TEST_LOCATION",
        });
        response = Response.json({
          revoked: true,
          classification: "TEST_LOCATION",
          arrivalVerified: false,
        });
      } else if (operation === "centre") {
        fields(body, [
          "labId",
          "mode",
          "latitude",
          "longitude",
          "consent",
          "durationSeconds",
        ]);
        if (
          body.consent !== true ||
          !["station", "map", "device"].includes(String(body.mode))
        )
          throw new AdminInputError("Explicit centre consent required.");
        const mode = body.mode as "station" | "map" | "device",
          duration = seconds(body.durationSeconds);
        if (
          mode !== "station" &&
          (typeof body.latitude !== "number" ||
            typeof body.longitude !== "number" ||
            ![body.latitude, body.longitude].every(Number.isFinite) ||
            Math.abs(body.latitude) > 90 ||
            Math.abs(body.longitude) > 180)
        )
          throw new AdminInputError("Invalid self/test centre.");
        await audit(ctx.user.id, "MRT_LAB_CENTRE_SET", {
          classification: "TEST_LOCATION",
          mode,
          durationSeconds: duration,
          consent: true,
        });
        lab = own(body.labId, ctx.binding);
        setLabCentre(
          lab,
          mode,
          mode === "station"
            ? undefined
            : {
                latitude: body.latitude as number,
                longitude: body.longitude as number,
              },
          duration,
        );
        response = Response.json(labStatus(lab));
      } else if (operation === "evaluate") {
        fields(body, ["labId", "stationId", "sample"]);
        if (
          typeof body.stationId !== "string" ||
          !network.stations.some((s) => s.id === body.stationId)
        )
          throw new AdminInputError("Official station required.");
        if (lab.centreMode === "expired")
          throw new AdminInputError(
            "Temporary centre expired. Revoke or explicitly select a new centre.",
            409,
          );
        const sample = body.sample;
        if (!sample || typeof sample !== "object" || Array.isArray(sample))
          throw new AdminInputError("A fresh sample is required.");
        fields(sample as Record<string, unknown>, [
          "latitude",
          "longitude",
          "accuracy",
          "timestamp",
        ]);
        const evaluatedCentre = lab.centre,
          evaluatedMode = lab.centreMode;
        let result;
        try {
          result = evaluateLocation(
            body.stationId,
            sample as {
              latitude: number;
              longitude: number;
              accuracy: number;
              timestamp: number;
            },
            Date.now(),
            evaluatedCentre,
          );
        } catch {
          throw new AdminInputError(
            "Invalid or stale sample. Request a new reading.",
          );
        }
        const outcome = result.outcome === "VERIFIED" ? "PASS" : result.outcome;
        await audit(ctx.user.id, "MRT_LAB_EVALUATED", {
          classification: "TEST_LOCATION",
          stationId: body.stationId,
          centreMode: lab.centreMode,
          sampleOutcome: outcome,
          reason: result.reason,
        });
        lab = own(body.labId, ctx.binding);
        if (
          lab.centreMode === "expired" ||
          lab.centre !== evaluatedCentre ||
          lab.centreMode !== evaluatedMode
        )
          throw new AdminInputError(
            "Temporary centre expired or changed. Evaluate a fresh sample.",
            409,
          );
        response = Response.json({
          classification: "TEST_LOCATION",
          arrivalVerified: false,
          sampleOutcome: outcome,
          reason: result.reason,
          accuracyMeters: result.accuracyMeters,
          distanceBand: result.distanceBand,
          policy: locationSettings(body.stationId),
          expiresAt: new Date(
            Math.min(lab.expiresAt, lab.centreExpiresAt ?? lab.expiresAt),
          ).toISOString(),
        });
      } else throw new AdminInputError("Unknown Lab operation.", 404);
    }
  } catch (error) {
    response =
      error instanceof AdminInputError
        ? apiError(error.message, error.status)
        : internalServerError("geofencing_lab", error);
  }
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Vary", "Cookie");
  return response;
}
