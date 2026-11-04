import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { connectTestDatabase } from "./support/test-database";
import { utcPostgresUrl } from "../lib/postgres-utc";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

test("UTC storage and pg/Prisma instants agree despite non-UTC server/client sessions", async () => {
  const raw = await connectTestDatabase();
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: utcPostgresUrl(process.env.DATABASE_URL!) }) });
  try {
    await raw.query("SET TIME ZONE 'Asia/Taipei'");
    const zone = await raw.query("SHOW timezone");
    assert.equal(zone.rows[0].TimeZone, "Asia/Taipei");
    const [binding] = await prisma.$queryRaw<{ zone: string }[]>`SELECT current_setting('TimeZone') AS zone`;
    assert.equal(binding.zone, "UTC");
    const [instants] = await prisma.$queryRaw<{ aware: Date; naive: Date }[]>`
      SELECT TIMESTAMPTZ '2035-01-01 10:00:00+08' AS aware,
             TIMESTAMP '2035-01-01 02:00:00' AS naive`;
    for (const value of Object.values(instants)) assert.equal(value.toISOString(), "2035-01-01T02:00:00.000Z");
    const pgInstant = await raw.query("SELECT TIMESTAMPTZ '2035-01-01 10:00:00+08' AS aware");
    assert.equal(pgInstant.rows[0].aware.toISOString(), instants.aware.toISOString());

    const user = await prisma.user.create({ data: { name: "UTC fixture", email: `utc-${randomUUID()}@example.test`, passwordHash: "not-a-login-credential" } });
    const expiry = new Date(Date.now() - 1000);
    await prisma.authSession.create({ data: { userId: user.id, tokenHash: randomUUID(), expiresAt: expiry } });
    const stored = await raw.query('SELECT "expiresAt"::text AS naive, extract(epoch FROM "expiresAt" AT TIME ZONE \'UTC\')::float8 AS epoch FROM "AuthSession" WHERE "userId"=$1', [user.id]);
    assert.equal(Math.round(stored.rows[0].epoch * 1000), expiry.getTime());
    const session = await prisma.authSession.findFirstOrThrow({ where: { userId: user.id } });
    assert.equal(session.expiresAt.toISOString(), expiry.toISOString());
    assert.ok(session.expiresAt.getTime() < Date.now());
    // SQL expiry fixtures must supply a UTC instant, never cast local NOW into a naive column.
    await raw.query('UPDATE "AuthSession" SET "expiresAt"=$2 WHERE "userId"=$1', [user.id, expiry.toISOString()]);
    assert.equal((await prisma.authSession.findFirstOrThrow({ where: { userId: user.id } })).expiresAt.toISOString(), expiry.toISOString());
    const created = await raw.query('SELECT extract(epoch FROM "createdAt" AT TIME ZONE \'UTC\')::float8 AS epoch FROM "User" WHERE id=$1', [user.id]);
    assert.ok(Math.abs(created.rows[0].epoch * 1000 - Date.now()) < 10000);
    console.log("UTC session, timestamptz offset, naive UTC storage, NOW default and expired-session roundtrip verified; raw session remained Asia/Taipei.");
  } finally { await prisma.$disconnect(); await raw.end(); }
});
