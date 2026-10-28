import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { commandInput, futureParticipationEligibility, scenarios } from "../lib/identity/contracts";
import { SyntheticIdentityStore } from "../lib/identity/simulation";
import { identityText } from "../lib/i18n/identity";
const time = Date.parse("2026-10-28T04:00:00Z");
function verified(store: SyntheticIdentityStore, key = "owned-session") {
 let s = store.read(key, time);
 s = store.apply(key, { action: "BEGIN", expectedVersion: s.version, documentType: "TW_ARC", scenario: "SUCCESS" }, null, time);
 for (let i = 0; i < 3; i++) s = store.apply(key, { action: "ADVANCE", expectedVersion: s.version }, null, time);
 return s;
}
test("synthetic states are isolated, cloned, versioned and never grant real participation", () => {
 const store = new SyntheticIdentityStore(), s = verified(store);
 assert.equal(s.state, "VERIFIED"); assert.equal(s.realEligibility, false);
 assert.equal(store.read("other-account", time).state, "NOT_STARTED"); assert.equal(store.read("new-session", time).version, 0);
 s.history.length = 0; assert.equal(store.read("owned-session", time).history.length, 4);
 for (const operation of ["PUBLISH_LISTING", "SUBMIT_RENTAL_REQUEST"] as const) for (const v of [s, { verified: true }, { state: "VERIFIED", provider: "forged" }, null]) assert.equal(futureParticipationEligibility(operation, v).eligible, false);
 assert.throws(() => store.apply("owned-session", { action: "ADVANCE", expectedVersion: s.version }, null, time));
});
test("all six scenarios execute required document/liveness/match stages without fake evidence", () => {
 for (const scenario of scenarios) {
  const store = new SyntheticIdentityStore(); let s = store.apply("s", { action: "BEGIN", expectedVersion: 0, documentType: "TW_NATIONAL_ID", scenario }, null, time);
  assert.equal(s.stage, "DOCUMENT");
  while (s.state === "PENDING") s = store.apply("s", { action: "ADVANCE", expectedVersion: s.version }, null, time);
  assert.equal(s.state, scenario === "SUCCESS" ? "VERIFIED" : ["MANUAL_REVIEW", "REJECTED"].includes(scenario) ? scenario : "RETRY_REQUIRED");
  assert.equal(s.realEligibility, false);
  if (s.state === "RETRY_REQUIRED") { s = store.apply("s", { action: "BEGIN", expectedVersion: s.version, documentType: "TW_ARC", scenario: "SUCCESS" }, null, time); assert.equal(s.stage, "DOCUMENT"); }
 }
});
test("expiry/revocation, conflicts, bounded history and absolute retention fail safely", () => {
 const store = new SyntheticIdentityStore(), s = verified(store);
 assert.equal(store.read("owned-session", time + 300000).state, "EXPIRED");
 assert.throws(() => store.apply("owned-session", { action: "REVOKE", expectedVersion: s.version }, null, time + 300000));
 const fresh = verified(new SyntheticIdentityStore()); assert.equal(fresh.state, "VERIFIED");
 const revoked = verified(store, "revoked"); assert.equal(store.apply("revoked", { action: "REVOKE", expectedVersion: revoked.version }, null, time).state, "REVOKED");
 assert.equal(store.read("owned-session", time + 1800000).state, "NOT_STARTED");
 for (let i = 0; i < 30; i++) store.apply("h", { action: "RESET", expectedVersion: i }, null, time);
 assert.equal(store.read("h", time).history.length, 24);
});
test("single-use session/booking scoped synthetic event challenge expires and never changes custody", () => {
 const store = new SyntheticIdentityStore(); let s = verified(store);
 s = store.apply("owned-session", { action: "CHALLENGE", expectedVersion: s.version, bookingId: 7 }, "PICKUP", time);
 assert.throws(() => store.apply("other-session", { action: "COMPLETE_CHALLENGE", expectedVersion: 0, challengeId: s.challenge!.id }, "PICKUP", time));
 assert.throws(() => store.apply("owned-session", { action: "COMPLETE_CHALLENGE", expectedVersion: s.version, challengeId: s.challenge!.id }, "RETURN", time));
 assert.throws(() => store.apply("owned-session", { action: "COMPLETE_CHALLENGE", expectedVersion: s.version, challengeId: s.challenge!.id }, "PICKUP", time + 120000));
 s = store.apply("owned-session", { action: "COMPLETE_CHALLENGE", expectedVersion: s.version, challengeId: s.challenge!.id }, "PICKUP", time + 1);
 assert(s.challenge!.consumed); assert.equal(s.realEligibility, false);
 assert.throws(() => store.apply("owned-session", { action: "COMPLETE_CHALLENGE", expectedVersion: s.version, challengeId: s.challenge!.id }, "PICKUP", time + 2));
});
test("closed commands reject forged identity/provider/biometric authority and unsupported documents", () => {
 const begin = { action: "BEGIN", expectedVersion: 0, documentType: "TW_ARC", scenario: "SUCCESS" };
 assert.equal(commandInput(begin).action, "BEGIN");
 for (const raw of [null, [], { ...begin, verified: true }, { ...begin, userId: 1 }, { ...begin, providerAttestation: "forged" }, { ...begin, documentType: "US_PASSPORT" }, { ...begin, scenario: "ADMIN_SUCCESS" }, { ...begin, faceImage: "blob" }, { action: "CALLBACK", expectedVersion: 0 }, { action: "ADVANCE", expectedVersion: -1 }]) assert.throws(() => commandInput(raw));
 assert.deepEqual(Object.keys(identityText("en")), Object.keys(identityText("zh-TW")));
});
test("identity candidate has no domain mutation, upload, inference, provider transport or activation switch", async () => {
 for (const file of ["lib/identity/service.ts", "lib/identity/simulation.ts", "lib/identity/contracts.ts"]) {
  const s = await readFile(file, "utf8"); assert.doesNotMatch(s, /prisma\.[\w.]*\.(?:create|update|deleteMany|upsert|executeRaw)\(|fetch\(|https?:\/\/|process\.env\.(?:PROVIDER|EKYC_LIVE)/);
 }
 const service = await readFile("lib/identity/service.ts", "utf8"); assert.match(service, /current_database/); assert.match(service, /session\.id/); assert.match(service, /user\.accountStatus !== "ACTIVE"/);
});
