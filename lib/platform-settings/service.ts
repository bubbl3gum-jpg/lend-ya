import "server-only";
import { cookies } from "next/headers";
import { createHash } from "node:crypto";
import { prisma } from "../prisma";
import { Prisma } from "@prisma/client";
import { AdminInputError } from "../admin/auth";
import {
  announcementAdmin,
  announcementCandidate,
} from "../announcements/service";
import { logOperationalError } from "../operational-error";
import { settingsConfig } from "./config";
import {
  KEYS,
  REGISTRY,
  POLICY,
  keyOf,
  decode,
  defaultEncoded,
  parseSettingCommand,
  type SettingView,
} from "./registry";
async function environment() {
  let config;
  try {
    config = settingsConfig();
  } catch {
    throw new AdminInputError("Display settings candidate unavailable.", 404);
  }
  const rows = await prisma.$queryRaw<
    { name: string; marker: string }[]
  >`SELECT current_database() name,shobj_description(oid,'pg_database') marker FROM pg_database WHERE datname=current_database()`;
  if (
    rows[0]?.name !== config.database.pathname.slice(1) ||
    rows[0]?.marker !== `hustlen-mrt-test:${config.runId}`
  )
    throw new AdminInputError("Owned settings environment unavailable.", 404);
  return config;
}
export async function settingsActor(key?: unknown) {
  const user = await announcementAdmin();
  if (key !== undefined) {
    try {
      keyOf(key);
    } catch {
      throw new AdminInputError("Unknown or prohibited setting.");
    }
  }
  const config = await environment();
  if (!config.adminIds.includes(user.id))
    throw new AdminInputError("Settings tester permission required.", 403);
  return { user, config };
}
export async function settingsEditorAvailable() {
  try {
    await settingsActor();
    return true;
  } catch (e) {
    if (e instanceof AdminInputError) return false;
    throw e;
  }
}
async function values(tx: Prisma.TransactionClient): Promise<SettingView[]> {
  const result: SettingView[] = [];
  for (const key of KEYS) {
    const row = await tx.devDisplaySetting.findUnique({ where: { key } });
    if (
      row &&
      (row.policy !== POLICY ||
        !Number.isInteger(row.version) ||
        row.version < 1)
    )
      throw Error("Invalid display configuration.");
    result.push({
      key,
      ...REGISTRY[key],
      value: row ? decode(key, row.value) : REGISTRY[key].defaultValue,
      version: row?.version ?? 0,
      source: row ? "DATABASE" : "DEFAULT",
      updatedAt: row?.updatedAt.toISOString() ?? null,
      actorId: row?.actorId ?? null,
    });
  }
  return result;
}
export async function readSettings() {
  await settingsActor();
  return prisma.$transaction((tx) => values(tx), {
    isolationLevel: "RepeatableRead",
  });
}
export async function historySettings(rawKey: unknown, before?: number) {
  const { user } = await settingsActor(rawKey);
  void user;
  const key = keyOf(rawKey);
  if (
    before !== undefined &&
    (!Number.isSafeInteger(before) || before < 1 || before > 2147483647)
  )
    throw new AdminInputError("Invalid history cursor.");
  const rows = await prisma.devDisplaySettingEvent.findMany({
    where: { key, ...(before ? { version: { lt: before } } : {}) },
    orderBy: { version: "desc" },
    take: 50,
    select: {
      id: true,
      key: true,
      action: true,
      previousValue: true,
      value: true,
      previousVersion: true,
      version: true,
      rollbackVersion: true,
      actorId: true,
      createdAt: true,
    },
  });
  return rows.map((r) => ({
    ...r,
    previousValue: decode(key, r.previousValue),
    value: decode(key, r.value),
  }));
}
export async function mutateSetting(input: Record<string, unknown>) {
  const { user } = await settingsActor(input.key);
  let command;
  try {
    command = parseSettingCommand(input);
  } catch (e) {
    throw new AdminInputError((e as Error).message);
  }
  const token = (await cookies()).get("p2p_session")?.value ?? "",
    tokenHash = createHash("sha256").update(token).digest("hex"),
    requestHash = createHash("sha256")
      .update(JSON.stringify(command))
      .digest("hex");
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SET LOCAL lock_timeout='1500ms'`;
    await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${command.requestId},0))`;
    await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${command.key},1))`;
    const session = await tx.authSession.findUnique({
        where: { tokenHash },
        select: { userId: true, expiresAt: true },
      }),
      actor = await tx.user.findUnique({
        where: { id: user.id },
        select: { role: true, accountStatus: true },
      });
    if (
      !session ||
      session.userId !== user.id ||
      session.expiresAt <= new Date()
    )
      throw new AdminInputError("Authentication required.", 401);
    if (actor?.role !== "ADMIN" || actor.accountStatus !== "ACTIVE")
      throw new AdminInputError("Administrator permission required.", 403);
    const prior = await tx.devDisplaySettingEvent.findUnique({
      where: { requestId: command.requestId },
    });
    if (prior) {
      if (prior.actorId !== user.id || prior.requestHash !== requestHash)
        throw new AdminInputError("Idempotency conflict.", 409);
      return { key: prior.key, version: prior.version, replayed: true };
    }
    const old = await tx.devDisplaySetting.findUnique({
        where: { key: command.key },
      }),
      version = old?.version ?? 0,
      previousValue = old?.value ?? defaultEncoded(command.key);
    if (old?.policy && old.policy !== POLICY)
      throw new AdminInputError("Configuration policy unavailable.", 409);
    decode(command.key, previousValue);
    if (version !== command.expectedVersion)
      throw new AdminInputError(
        "Setting changed; reload before retrying.",
        409,
      );
    let value = command.value;
    if (command.action === "ROLLBACK") {
      if (command.targetVersion === 0) value = defaultEncoded(command.key);
      else {
        const target = await tx.devDisplaySettingEvent.findUnique({
          where: {
            key_version: { key: command.key, version: command.targetVersion! },
          },
        });
        if (!target || target.policy !== POLICY)
          throw new AdminInputError("Rollback version unavailable.", 409);
        value = target.value;
      }
    }
    if (value === null) throw new AdminInputError("Invalid value.");
    decode(command.key, value);
    const data = { value, version: version + 1, actorId: user.id };
    if (old)
      await tx.devDisplaySetting.update({ where: { key: command.key }, data });
    else
      await tx.devDisplaySetting.create({
        data: { key: command.key, ...data },
      });
    await tx.devDisplaySettingEvent.create({
      data: {
        key: command.key,
        action: command.action,
        previousValue,
        value,
        previousVersion: version,
        version: version + 1,
        rollbackVersion: command.targetVersion,
        actorId: user.id,
        requestId: command.requestId,
        requestHash,
      },
    });
    return { key: command.key, version: version + 1, replayed: false };
  });
}
export async function demoDisplaySettings() {
  await announcementCandidate(); // Eligibility never comes from a display setting.
  if (process.env.HUSTLEN_SETTINGS_CANDIDATE !== "owned-display-only")
    return { visible: true, maxVisible: 100, status: "DEFAULT" };
  try {
    await environment();
    const rows = await prisma.$transaction((tx) => values(tx), {
      isolationLevel: "RepeatableRead",
    });
    return {
      visible: rows[0].value as boolean,
      maxVisible: rows[1].value as number,
      status: rows.some((r) => r.source === "DATABASE")
        ? "DATABASE"
        : "DEFAULT",
    };
  } catch (e) {
    logOperationalError("settings.display_unavailable", e);
    return { visible: false, maxVisible: 0, status: "UNAVAILABLE" };
  }
}
