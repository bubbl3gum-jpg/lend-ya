import { randomUUID } from "node:crypto";
import type { Command, DocumentType, IdentityState, Scenario } from "./contracts";
export class SimulationError extends Error {
  constructor(public status: number, public code: "CONFLICT" | "CAPACITY" | "CHALLENGE" = "CONFLICT") { super(code); }
}
type Stage = "NONE" | "DOCUMENT" | "LIVENESS" | "MATCH" | "DONE";
type Event = { version: number; action: string; state: IdentityState; at: string };
export type Simulation = {
  source: "SYNTHETIC_NOT_IDENTITY_VERIFICATION"; realEligibility: false; version: number;
  state: IdentityState; stage: Stage; documentType: DocumentType | null;
  scenario: Scenario | null; attemptId: string | null; policyVersion: "SYN-13C-v1";
  verifiedAt: string | null; expiresAt: string | null;
  challenge: { id: string; bookingId: number; purpose: "PICKUP" | "RETURN"; kind: "SYNTHETIC_LIVENESS_NO_CAMERA"; expiresAt: string; consumed: boolean } | null;
  history: Event[];
};
function initial(): Simulation { return { source: "SYNTHETIC_NOT_IDENTITY_VERIFICATION", realEligibility: false, version: 0, state: "NOT_STARTED", stage: "NONE", documentType: null, scenario: null, attemptId: null, policyVersion: "SYN-13C-v1", verifiedAt: null, expiresAt: null, challenge: null, history: [] }; }
/** Ephemeral single-process demo only. Never an authoritative database/audit store. */
export class SyntheticIdentityStore {
  private records = new Map<string, { value: Simulation; removeAt: number; operations: number }>();
  private sweep(now: number) { for (const [key, record] of this.records) if (record.removeAt <= now) this.records.delete(key); }
  private record(key: string, now: number) {
    this.sweep(now);
    let record = this.records.get(key);
    if (!record) {
      if (this.records.size >= 128) throw new SimulationError(503, "CAPACITY");
      record = { value: initial(), removeAt: now + 30 * 60_000, operations: 0 }; this.records.set(key, record);
      const owned = record;
      setTimeout(() => { if (this.records.get(key) === owned) this.records.delete(key); }, 30 * 60_000).unref();
    }
    const v = record.value;
    if (v.state === "VERIFIED" && v.expiresAt && Date.parse(v.expiresAt) <= now) { v.state = "EXPIRED"; v.challenge = null; this.event(v, "EXPIRE", now); }
    return record;
  }
  private event(v: Simulation, action: string, now: number) {
    v.version++; v.history.push({ version: v.version, action, state: v.state, at: new Date(now).toISOString() });
    if (v.history.length > 24) v.history.shift();
  }
  read(key: string, now = Date.now()): Simulation { return structuredClone(this.record(key, now).value); }
  apply(key: string, c: Command, purpose: "PICKUP" | "RETURN" | null = null, now = Date.now()): Simulation {
    const record = this.record(key, now), v = record.value;
    if (++record.operations > 60) throw new SimulationError(429, "CAPACITY");
    if (c.expectedVersion !== v.version) throw new SimulationError(409);
    if (c.action === "BEGIN") {
      if (v.state === "PENDING") throw new SimulationError(409);
      Object.assign(v, { state: "PENDING", stage: "DOCUMENT", documentType: c.documentType, scenario: c.scenario, attemptId: randomUUID(), verifiedAt: null, expiresAt: null, challenge: null });
    } else if (c.action === "ADVANCE") {
      if (v.state !== "PENDING") throw new SimulationError(409);
      if (v.stage === "DOCUMENT") {
        if (v.scenario === "DOCUMENT_RETRY") { v.state = "RETRY_REQUIRED"; v.stage = "DONE"; } else v.stage = "LIVENESS";
      } else if (v.stage === "LIVENESS") {
        if (v.scenario === "LIVENESS_RETRY") { v.state = "RETRY_REQUIRED"; v.stage = "DONE"; } else v.stage = "MATCH";
      } else if (v.stage === "MATCH") {
        v.state = v.scenario === "MATCH_RETRY" ? "RETRY_REQUIRED" : v.scenario === "MANUAL_REVIEW" ? "MANUAL_REVIEW" : v.scenario === "REJECTED" ? "REJECTED" : "VERIFIED";
        v.stage = "DONE";
        if (v.state === "VERIFIED") { v.verifiedAt = new Date(now).toISOString(); v.expiresAt = new Date(now + 5 * 60_000).toISOString(); }
      } else throw new SimulationError(409);
    } else if (c.action === "REVOKE") {
      if (v.state !== "VERIFIED") throw new SimulationError(409);
      v.state = "REVOKED"; v.challenge = null;
    } else if (c.action === "RESET") {
      Object.assign(v, { ...initial(), version: v.version, history: v.history });
    } else if (c.action === "CHALLENGE") {
      if (!purpose || v.state !== "VERIFIED" || (v.challenge && !v.challenge.consumed && Date.parse(v.challenge.expiresAt) > now)) throw new SimulationError(409, "CHALLENGE");
      v.challenge = { id: randomUUID(), bookingId: c.bookingId, purpose, kind: "SYNTHETIC_LIVENESS_NO_CAMERA", expiresAt: new Date(now + 120_000).toISOString(), consumed: false };
    } else if (c.action === "COMPLETE_CHALLENGE") {
      if (!purpose || v.state !== "VERIFIED" || !v.challenge || v.challenge.purpose !== purpose || v.challenge.id !== c.challengeId || v.challenge.consumed || Date.parse(v.challenge.expiresAt) <= now) throw new SimulationError(409, "CHALLENGE");
      v.challenge.consumed = true;
    }
    this.event(v, c.action, now);
    return structuredClone(v);
  }
}
