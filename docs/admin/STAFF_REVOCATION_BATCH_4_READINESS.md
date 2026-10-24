# Revocation safety and Batch 4 readiness

24 October 2026 (Asia/Taipei). No controlled staff activation is authorized by this checklist.

## What database-backed tests establish

The Batch 3C shadow transaction uses READ COMMITTED and shared row locks held until commit on the persisted AuthSession, account, binding, step-up record, exact grants, membership, permanent association, canonical person and authorization-version rows. Grant→membership→association→person/epoch ordering follows the existing source-change trigger dependencies. State is reloaded after locks and again before commit; current clocks, expiry and grant validity are rechecked. A DB-backed domain checker must also lock or version/recheck assignment and evidence records in the same transaction.

A second PostgreSQL connection tries to revoke a membership during a paused read. The test observes `pg_stat_activity.wait_event_type='Lock'`, resumes the read, commits its shadow audit/data result, then observes revocation complete. The next read denies. This establishes a specific linearization: the already locked read finishes **before** revocation commits; it does not claim revocation cancels bytes already authorized and committed. After commit, neither revocation nor any system can retract bytes already delivered or buffered for a valid result.

Other tests mutate an authorization epoch or synthetic case assignment **inside** a read transaction: the final authoritative check fails, the result is withheld, and its SHADOW_COMMITTED event rolls back. A separate denial event remains. A real grant expires while PostgreSQL delays retrieval; no data returns. Audit insertion outage prevents the read callback running. A read failure records FAILED separately, never a committed domain action.

| Change | Current foundation behavior | Remaining production gate |
| --- | --- | --- |
| Membership/grant/person/link revocation or epoch change | Existing triggers maintain epochs; locked current rows and final reload deny stale bindings/grants | Integrate all production writers with reviewed lock order; test complete mutation surface |
| Session expiry/deletion/invalidation | Session and birth timestamp rechecked; deletion retains history and is not blocked by a new FK | Trusted transport and live staff-session lifecycle not issued |
| Account suspension | Current account status required; row locked during read | Preserve existing rental/return/support obligations; no new sanctions implemented |
| Step-up/binding revocation | Terminal status checked from persisted rows, locked until commit | Trusted MFA connector, revocation writer identity and protected lifecycle history |
| Grant expiry during a read | Wall-clock checks before/after; final failure releases no result | Bound request duration and test deadline boundaries under real load |
| Policy change | Fixed policy and persisted bigint epoch checked; unknown/mismatched policy denies | Reviewed policy-version migration and binding replacement; no editable activation flag |
| Assignment/participant/investigator changes | Domain seam checked twice; test fixture assignment uses SQL shared locks | General persisted assignment/alias/conflict/evidence adapters absent |
| Concurrent revocation | Real row-lock test establishes read-before-revocation ordering | Global deadlock/timeout protocol, resource locks, all session/offboarding writers and distributed transport/cache review |

These are relational guarantees on newly owned fixtures, not in-memory authorization claims. Pending contexts remain inspection-only. Existing Batch 3B reads are not wired to this transaction protocol. A malicious or mistaken server domain callback is not a substitute for real assignments. Deadlocks, serialization failures, lock timeouts, audit failures and database errors must deny and roll back; availability and global lock ordering need staging/load review. User deletion/cascade and future provisioning paths may introduce additional lock interactions; this batch does not claim a globally deadlock-free protocol.

## Explicit Batch 4 preparation checklist

- [ ] Independently approve canonical human proofing/deduplication, issuer allowlisting and cryptographic MFA/assertion verification, replay handling, recovery and recent-authentication TTLs. A UUID issuer/proof reference or MFA string is not attestation. The 15-minute stored window is an engineering ceiling, not a product-approved step-up policy.
- [ ] Implement a separately reviewed live staff-session issuer/revoker and immutable human actor/attestation provenance, without changing marketplace AuthSession semantics. No existing ADMIN automatically becomes Super Admin. Never grant legacy ADMIN to lower roles.
- [ ] Add reviewed general assignment, case/channel and bounded evidence-purpose/version persistence. Resolve all participant aliases, targets, investigators, recommenders and prior reviewers from server data. Keep Owner/Borrower conversations separately private.
- [ ] Replace synthetic callbacks with scoped, field-limited query adapters in the same authorization/audit transaction. Cover bookings/listings/users/reports/disputes/moderation/audit/private media and every legacy helper, route, page, CLI and protected transport from the complete inventory.
- [ ] Design version/expiry/lock ordering for every grant/session/policy/assignment writer, including deletion and offboarding. Test revocation races, parallel readers, audit outages, timeouts, deadlocks, caches, mixed versions and no post-denial byte release.
- [ ] Separate restricted runtime, controlled migration and protected audit-writing principals. Runtime must not own schema, alter/disable triggers, create arbitrary functions, truncate history or impersonate the audit writer. Review any minimal write interface separately; no SECURITY DEFINER shortcut is approved. No production credentials or infrastructure were changed here.
- [ ] Approve retention/legal holds, staff account-link correction and data-subject procedures. Preserve permanent aliases and old identity/provenance; do not make a new person to reset conflicts or rolling safety budgets. Prefer minimal retained references and separately protected proof, not proof documents in audit logs. Retention periods and protected archival/pseudonymization remain decisions; no destructive purge is implemented.
- [ ] Independently review all proposed role allocations and the approved future restriction rules (48-hour single cap, 24-hour independent review, 72-hour union in rolling 30 days, no alias/related-incident reset, preserved custody/support obligations). No restriction functionality is activated here.
- [ ] Rehearse fresh/populated migration and backup/restore in staging; preserve old clients, sessions, immutable records and forward-only recovery. Rollback application code while retaining additive history; do not drop tables or reset migrations.
- [ ] Prepare distinct authorized-human coverage for bootstrap, staff grants and serious sanctions. When conflicts or a small team leave no independent reviewer, hold the action; alternate accounts and service principals cannot supply another human vote.
- [ ] Only after independent review consider an explicitly authorized forward migration/cutover that revisits ACTIVE constraints and the forbidden COMMITTED outcome. No flag, pending binding, shadow MATCH or database row permits early activation.

## Subsequent approval-engine batch

Design proposal, independent decision and single execution separately. Bind exact capability, canonical payload hash, resource/evidence versions, current authorization/policy, expiry and actor attestation. Exclude participants/targets/investigators/recommenders/conflicted original reviewers by canonical human, not account. Require current proposer/approver eligibility and fresh step-up at execution; audit and domain effects commit atomically with idempotency. No self-granting, emergency invariant bypass, general booking status editor, unrestricted evidence export, AI executor or payment movement. This remains a plan; no execution or approval persistence is implemented in Batch 3C.
