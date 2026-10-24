# MFA rollout and staff-session readiness — Batch 5A

24 October 2026 (Asia/Taipei). WebAuthn/passkeys primary is approved; TOTP fallback is not. No production RP, enforcement date, recovery provider or identity-verification authority is inferred from that choice.

## Staged gates

| Stage | Required review and proof | Current state |
| --- | --- | --- |
| Foundation | Real verifier, current-session binding, atomic audit/replay/rate-limit tests, empty additive schema, legacy regression and old-client compatibility | Implemented in this isolated batch; see review/evidence. |
| Deployment design | Approve exact production/staging RP IDs and origins, HTTPS/ingress/Host handling, per-environment credential isolation, runtime DB verifier privileges, data retention, supply-chain updates | Blocked pending deployment/security approval. Localhost acceptance is not a production-domain approval. |
| Human onboarding and recovery | Approve canonical-person proofing operator/evidence, alias reconciliation, assisted first enrollment, second-key guidance, lost-device recovery, notifications, audit access, independent review and emergency access | Blocked. No provisioning, reset endpoint, recovery secret, TOTP/email fallback or bypass exists. |
| Optional legacy Admin pilot | Separate reviewed UI/API with strict origin/body bounds and HttpOnly cookies; explicit enrollment consent, multiple device/browser rehearsal, support/recovery drill, revocation/logout checks, telemetry without secrets | Future batch. Existing legacy login remains unchanged. |
| Legacy Admin enforcement | Reviewed enforcement policy, rollback/custody access, session renewal/rotation, anti-CSRF, authentication freshness, recovery and emergency drill; all privileged legacy entry points covered consistently | Future separately approved release. A flag alone must not activate staff powers. |
| Real staff-session issuer | Reviewed bounded scoped data access, atomic authorization/audit writer, current ACTIVE membership/grant/version/scope/conflict checks, exact MFA/session binding and fail-closed invalidation | Blocked by current activation constraints and absent issuer. Never add ADMIN OR staffRole fallback. |
| Four-role cutover | Approve capability allocations, provisioning/independent-human reconciliation, bootstrap and small-team separation-of-duties plan; review each route/service/action and old session behavior | Future. Existing ADMIN users are not automatically Super Admins; lower roles never receive ADMIN merely to pass legacy guards. |
| Independent approvals and execution | Domain-specific policy/invariant/evidence review, distinct verified human proposal/approval, exact payload/version/session/step-up binding and atomic execution audit | Still blocked by Batches 4A/4B controls; MFA alone cannot unlock it. |

## Recovery requirements to decide

Choose identity re-proofing authority, independent reviewers, expected delay and notification channels; define lost-last-key, compromised-session and unavailable-reviewer handling. Any approved recovery must revoke all old factor/session/authorization epochs atomically, preserve immutable history, rate-limit attempts and notify the affected person. Two accounts must never count as two humans. Recovery assurances and emergency powers need their own narrowly scoped authorization and review. Do not implement a hidden password/email reset, temporary ADMIN flag, owner SQL recipe or one-person self-approval as a shortcut.

First enrollment here requires an already verified association plus password but has no production onboarding API. Before exposing it, settle assurance for assisted enrollment and resistance to stolen-session/password enrollment. Synced passkeys may satisfy UV using a device PIN; no biometric/hardware assurance is asserted. Approve whether future high-risk actions require device-bound keys or additional controls. `attestation=none` intentionally does not certify hardware.

## Operational and security limitations

Legacy ADMIN/ChatReviewer access remains as before and has no mandatory MFA gate. Existing email-scoped login limits can be exhausted for a victim, and recovery UX does not exist. These are reviewed baseline risks, not solved by an unused verifier. Marketplace suspended-session handling remains distinct from privileged ACTIVE checks and custody/support obligations.

No production endpoint imports the new service. A future route must obtain the raw session token from the secure server cookie, supply a server-owned realm, validate bounded JSON and enforce exact approved Origin/CSRF. Never accept person IDs, roles, policy versions, MFA flags, risk levels, RP domains or assurance truth from a request body. An assurance ID is only a lookup key, never proof on its own. Revalidate it at use and keep evidence/booking invariants and participant conflicts enforced by the relevant service.

The current database owner can bypass triggers. Dedicated verifier writer credentials, authorization-ledger insertion privileges and a consistent lock/revocation order are production prerequisites. Append-only MFA metadata has no production retention worker; approve retention before exposure. No raw private key or reusable proof is retained by the application. MFA does not replace authorization, human identity proofing or independent approvals.

New dependency audit results and unresolved baseline advisories are recorded in `STAFF_MFA_REVIEW_BATCH_5A.md`. Do not treat successful tests or a version pin as a universal vulnerability resolution.

## Reproduction and cleanup

Use Node 24, npm lockfile install, PostgreSQL and Chromium. Set `MRT_TEST_DATABASE_URL` to a **new local `hustlen_test_*` database name** and `CHROMIUM_PATH` to the installed executable; leave the application database untouched. Do not print connection URLs or reuse another run's ownership marker. `npm run test:mfa` uses the existing isolated runner: it verifies effective target/ownership, creates a new database, migrates only it, runs actual signatures and the loopback browser harness, then drops its owned database/uploads. `npm run test:mfa-migration` independently creates another owned database and tests baseline upgrade/failure/replay/old-client preservation. Its baseline is the exact reviewed Batch 4B commit and requires Git history to be available.

Retained `.test-artifacts/<run>` contain fixture screenshots/preservation metadata/generated old clients. They are ignored by Git. Inspect them locally and remove only the matching run directory when no longer needed. The committed `docs/security/batch5a` artifacts contain reviewed metadata and a sanitized local acceptance screenshot; no credential proof/private key/database URL is published. No cleanup command targets an existing application database.
