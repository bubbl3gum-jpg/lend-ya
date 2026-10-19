import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { checklistItems } from "../lib/rental-checklist";
import { connectTestDatabase } from "./support/test-database";

// Run only through run-isolated.ts --stability: never adopt an existing database.
test("Milestone 1: retries, auth isolation, evidence auditing and transport boundaries", async (t) => {
  const db = await connectTestDatabase();
  const base = process.env.TEST_BASE_URL!;
  const api = async (url: string, cookie = "", method = "GET", body?: object | FormData, headers: Record<string, string> = {}) => {
    const response = await fetch(base + url, {
      method,
      headers: { Cookie: cookie, ...(body instanceof FormData ? {} : { "Content-Type": "application/json" }), ...headers },
      ...(body ? { body: body instanceof FormData ? body : JSON.stringify(body) } : {}),
    });
    const bytes = Buffer.from(await response.arrayBuffer());
    return { status: response.status, cookie: response.headers.get("set-cookie")?.split(";")[0] ?? "", body: response.headers.get("content-type")?.includes("application/json") ? JSON.parse(bytes.toString()) : null, bytes };
  };
  try {
    const register = async () => {
      const email = `${randomUUID()}@stability.test`;
      const r = await api("/api/auth/register", "", "POST", { name: "Stability fixture", email, password: "IsolatedTest123!" });
      assert.equal(r.status, 201);
      return { ...r.body.user, email, cookie: r.cookie } as { id: number; email: string; cookie: string };
    };
    const owner = await register(), borrower = await register(), admin = await register();
    await db.query('UPDATE "User" SET role=\'ADMIN\' WHERE id=$1', [admin.id]);
    const station = (await db.query('SELECT id FROM "MrtStation" WHERE code=\'TPE\'')).rows[0].id;
    const image = await sharp({ create: { width: 8, height: 8, channels: 3, background: "blue" } }).png().toBuffer();
    const form = new FormData();
    for (const [k, v] of Object.entries({ title: "Retry fixture", description: "Isolated regression", category: "Cameras", condition: "Good", price: "10", stationIds: JSON.stringify([station]) })) form.set(k, v);
    form.append("photos", new File([new Uint8Array(image)], "fixture.png", { type: "image/png" }));
    const listing = await api("/api/listings", owner.cookie, "POST", form);
    assert.equal(listing.status, 201);
    const listingId = listing.body.listing.id;
    const input = { listingId, meetingStationId: station, startAt: "2035-01-01T10:00", endAt: "2035-01-02T10:00", notes: "Retry fixture" };
    await t.test("report gating is existing policy; an unreviewed allegation blocks booking until dismissal", async () => {
      const report = await api(`/api/listings/${listingId}/report`, admin.cookie, "POST", { reason: "Policy observation", description: "No enforcement policy change in this milestone" });
      assert.equal(report.status, 201);
      assert.equal((await api("/api/bookings", borrower.cookie, "POST", input)).status, 409);
      assert.equal((await api(`/api/admin/reports/${report.body.report.id}/resolve`, admin.cookie, "POST", { decision: "DISMISS", reason: "Isolated policy observation complete" })).status, 200);
    });
    let bookingId: number;
    await t.test("same idempotency key returns one booking, including concurrent retries and after acceptance", async () => {
      const key = randomUUID();
      const submit = (body = input, cookie = borrower.cookie) => api("/api/bookings", cookie, "POST", body, { "Idempotency-Key": key });
      const initial = await Promise.all([submit(), submit()]);
      const first = initial[0];
      assert.equal(first.status, 201);
      assert.equal(initial[1].status, 201);
      assert.equal(initial[1].body.booking.id, first.body.booking.id);
      bookingId = first.body.booking.id;
      const results = await Promise.all([submit(), submit()]);
      for (const r of results) {
        assert.ok([200, 201].includes(r.status));
        assert.equal(r.body.booking.id, bookingId);
      }
      assert.equal((await db.query('SELECT count(*)::int n FROM "Booking" WHERE "listingId"=$1', [listingId])).rows[0].n, 1);
      assert.equal((await submit({ ...input, notes: "Changed payload" })).status, 409);
      // Another actor cannot obtain the first actor's booking by guessing their key.
      const other = await submit(input, admin.cookie);
      assert.equal(other.status, 201);
      assert.notEqual(other.body.booking.id, bookingId);
      assert.equal((await api(`/api/bookings/${bookingId}`, owner.cookie, "PATCH", { action: "accept" })).status, 200);
      const replay = await submit();
      assert.ok([200, 201].includes(replay.status));
      assert.equal(replay.body.booking.id, bookingId);
      assert.equal(replay.body.booking.status, "CONFIRMED");
    });
    await t.test("pending handoff has no refusal/no-show escape; acknowledgements and evidence remain required", async () => {
      const row = (await db.query('SELECT id,status FROM "Booking" WHERE "listingId"=$1 AND "renterId"=$2 ORDER BY id LIMIT 1', [listingId, borrower.id])).rows[0];
      if (row.status === "PENDING") assert.equal((await api(`/api/bookings/${row.id}`, owner.cookie, "PATCH", { action: "accept" })).status, 200);
      const evidence = { checklist: Object.fromEntries(Object.keys(checklistItems).map((key) => [key, "yes"])), conditionConfirmed: true, conditionNotes: "Owner record preserved" };
      assert.equal((await api(`/api/bookings/${row.id}/handoff`, owner.cookie, "POST", evidence)).status, 200);
      assert.equal((await api(`/api/bookings/${row.id}`, borrower.cookie, "PATCH", { action: "cancel" })).status, 409);
      assert.equal((await api(`/api/bookings/${row.id}/dispute`, borrower.cookie, "POST", { reason: "Failed meetup", description: "Policy decision required" })).status, 409);
      assert.equal((await api(`/api/bookings/${row.id}/handoff`, borrower.cookie, "POST", { ...evidence, conditionConfirmed: false })).status, 400);
      const current = await api(`/api/bookings/${row.id}`, borrower.cookie);
      assert.equal(current.body.booking.status, "HANDOFF_PENDING");
      assert.equal(current.body.booking.handoff.conditionNotes, "Owner record preserved");
      assert.equal(current.body.booking.handoff.confirmedBy, null);
    });
    await t.test("a database deadlock returns a retryable conflict without changing the booking", async () => {
      const id = (await db.query('INSERT INTO "Booking" ("listingId","ownerId","renterId","meetingStationId","startAt","endAt",status,"totalPrice","updatedAt") VALUES ($1,$2,$3,$4,\'2037-01-01\',\'2037-01-02\',\'CONFIRMED\',10,NOW()) RETURNING id', [listingId, owner.id, borrower.id, station])).rows[0].id;
      await db.query(`CREATE FUNCTION stability_deadlock() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF OLD.id=${id} THEN RAISE EXCEPTION SQLSTATE '40P01' USING MESSAGE='Injected deadlock'; END IF; RETURN NEW; END $$; CREATE TRIGGER stability_deadlock BEFORE UPDATE ON "Booking" FOR EACH ROW EXECUTE FUNCTION stability_deadlock()`);
      try {
        assert.equal((await api(`/api/bookings/${id}`, borrower.cookie, "PATCH", { action: "cancel" })).status, 409);
        assert.equal((await db.query('SELECT status FROM "Booking" WHERE id=$1', [id])).rows[0].status, "CONFIRMED");
        const evidence = new FormData();
        evidence.set("payload", JSON.stringify({ checklist: Object.fromEntries(Object.keys(checklistItems).map((key) => [key, "yes"])), conditionConfirmed: true }));
        evidence.append("photos", new File([new Uint8Array(image)], "condition.png", { type: "image/png" }));
        assert.equal((await api(`/api/bookings/${id}/handoff`, owner.cookie, "POST", evidence)).status, 409);
        assert.equal((await db.query('SELECT count(*)::int n FROM "Handoff" WHERE "bookingId"=$1', [id])).rows[0].n, 0);
        assert.equal((await db.query('SELECT count(*)::int n FROM "BookingEvidencePhoto" WHERE "bookingId"=$1', [id])).rows[0].n, 0);
      } finally { await db.query('DROP TRIGGER stability_deadlock ON "Booking"; DROP FUNCTION stability_deadlock()'); }
    });
    await t.test("unrelated authentication traffic cannot lock out a different account", async () => {
      // Exact persisted boundary created by 1000 other attempts, without expensive brute force.
      await db.query('INSERT INTO "AuthRateLimit" (key,attempts,"expiresAt") VALUES (\'login:global\',1000,NOW()+INTERVAL \'15 minutes\') ON CONFLICT (key) DO UPDATE SET attempts=1000');
      const r = await api("/api/auth/login", "", "POST", { email: owner.email, password: "IsolatedTest123!" });
      await db.query('DELETE FROM "AuthRateLimit" WHERE key=\'login:global\'');
      assert.equal(r.status, 200);
      // Retain account-specific protection, including concurrent updates.
      const email = `${randomUUID()}@stability.test`;
      const failures = await Promise.all(Array.from({ length: 11 }, () => api("/api/auth/login", "", "POST", { email, password: "WrongPassword123!" })));
      assert.equal(failures.filter((x) => x.status === 401).length, 10);
      assert.equal(failures.filter((x) => x.status === 429).length, 1);
    });
    await t.test("cross-origin and non-JSON login cannot create a browser session", async () => {
      const payload = { email: owner.email, password: "IsolatedTest123!" };
      const cross = await api("/api/auth/login", "", "POST", payload, { Origin: "https://untrusted.example", "Sec-Fetch-Site": "cross-site" });
      assert.equal(cross.status, 403);
      assert.equal(cross.cookie, "");
      const plain = await api("/api/auth/login", "", "POST", payload, { "Content-Type": "text/plain" });
      assert.equal(plain.status, 415);
      assert.equal(plain.cookie, "");
    });
    await t.test("admin evidence reads are case-scoped, audited, and fail closed if auditing fails", async () => {
      // Independent valid custody fixture: preserve all existing application records.
      const b = (await db.query('INSERT INTO "Booking" ("listingId","ownerId","renterId","meetingStationId","startAt","endAt",status,"totalPrice","updatedAt") VALUES ($1,$2,$3,$4,\'2036-01-01\',\'2036-01-02\',\'DISPUTED\',10,NOW()) RETURNING id', [listingId, owner.id, borrower.id, station])).rows[0].id;
      const dispute = (await db.query('INSERT INTO "Dispute" ("bookingId","openedBy",reason,description) VALUES ($1,$2,\'Test concern\',\'Private evidence fixture\') RETURNING id', [b, borrower.id])).rows[0].id;
      const photo = randomUUID();
      await db.query('INSERT INTO "BookingEvidencePhoto" (id,"bookingId","uploaderId",stage,"mimeType",data) VALUES ($1,$2,$3,\'HANDOFF_OWNER\',\'image/png\',$4)', [photo, b, owner.id, image]);
      const url = `/api/admin/disputes/${dispute}/evidence/${photo}`;
      const before = (await db.query('SELECT count(*)::int n FROM "AdminAuditLog"')).rows[0].n;
      assert.equal((await api(url, borrower.cookie)).status, 403);
      assert.equal((await api(url.replace(photo, randomUUID()), admin.cookie)).status, 404);
      assert.equal((await db.query('SELECT count(*)::int n FROM "AdminAuditLog"')).rows[0].n, before);
      const read = await api(url, admin.cookie);
      assert.equal(read.status, 200);
      assert.deepEqual(read.bytes, image);
      const logs = (await db.query('SELECT * FROM "AdminAuditLog" WHERE action=\'EVIDENCE_VIEWED\' AND "targetId"=$1', [dispute])).rows;
      assert.equal(logs.length, 1);
      assert.equal(logs[0].adminId, admin.id);
      assert.equal(logs[0].newState.photoId, photo);
      assert.ok(!JSON.stringify(logs).includes(image.toString("base64")));
      const filtered = await api(`/api/admin/audit-logs?action=EVIDENCE_VIEWED`, admin.cookie);
      assert.equal(filtered.status, 200);
      await db.query(`CREATE FUNCTION stability_fail_read_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action='EVIDENCE_VIEWED' THEN RAISE EXCEPTION 'Injected read audit failure'; END IF; RETURN NEW; END $$; CREATE TRIGGER stability_read_audit BEFORE INSERT ON "AdminAuditLog" FOR EACH ROW EXECUTE FUNCTION stability_fail_read_audit()`);
      try {
        const denied = await api(url, admin.cookie);
        assert.equal(denied.status, 500);
        assert.notDeepEqual(denied.bytes, image);
      } finally {
        await db.query('DROP TRIGGER stability_read_audit ON "AdminAuditLog"; DROP FUNCTION stability_fail_read_audit()');
      }
      await db.query('UPDATE "User" SET "accountStatus"=\'SUSPENDED\' WHERE id=$1', [admin.id]);
      assert.equal((await api(url, admin.cookie)).status, 403);
    });
  } finally { await db.end(); }
});
