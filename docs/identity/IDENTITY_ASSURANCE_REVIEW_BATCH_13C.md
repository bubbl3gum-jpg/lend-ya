# Batch 13C — eKYC Identity Assurance Foundation

28 October 2026 · Asia/Taipei · isolated review candidate. No production identity verification authorized.

## Revisions and baseline

- Starting branch: `feature/trust-evidence-inspection-batch-13b`.
- Actual clean starting HEAD: `6ff743df3871cc58437a72f5f36bc595fbffe9ea`.
- Verified ancestor implementation: `fa5b3e3dc81b4727c063aad6fe50ba601b0734fd`; font fix `4a723a95d7fe712ea0c648307f3fe14983aa7f05`; evidence `b74870afdeef5937de471a3fbf0a99e9b6a08599`.
- New branch: `feature/identity-assurance-foundation-batch-13c`.
- Implementation: `13b114330535c0ba8a9066230dba29d9a8f23666`.
- Separate evidence closeout: `f639e074005a59a146ba2f8c9318b84d9709712c`.

No push, merge, deployment, existing application database mutation, schema/migration/lockfile/dependency change, real ID/biometric processing, provider/AI call, new staff access or production participation restriction. No subsequent batch started.

## What works

An actual bilingual account UI at `/account/identity`, reachable through the existing Verification page only after the full owned-development gate. Actual persisted session/account authentication; closed HTTP commands; server-controlled scripted document, liveness and match stages; retry/manual-review/rejected outcomes; five-minute synthetic expiry, revocation, bounded history and explicit no-real-eligibility status. Reload retains the same demonstration within this session/process; new native login has separate state.

The event demonstration reads an actual participant booking, selects pickup/return from HANDOFF_PENDING/RETURN_PENDING, rejects mid-rental/unrelated bookings and creates an expiring, single-use **synthetic** challenge. It cannot write a meetup receipt, booking, handoff, return or evidence. No camera or face is collected by 13C. Existing actual QR/GPS/camera/consent/custody checks remain authoritative.

It uses the existing heritage shell/materials, preferences and locale context. No new artwork, font, redesign, particles or audio. [Real desktop/tablet/mobile screenshots](batch13c/SCREENSHOTS.md) and [browser evidence](batch13c/browser-evidence.json) are independently inspectable. This is not Stage 9 aesthetic acceptance or a verified identity badge.

## Data and authority boundary

The new provider-independent contracts describe attempt/account/document/jurisdiction/policy/provenance, outcome/expiry/invalidation and future event binding. The working simulator holds only synthetic metadata in memory: 128 session records,60 mutation attempts per record,24 history events and absolute 30m expiry/process exit cleanup. No new identity persistence or immutable verification audit is claimed. Avoiding an authoritative schema while provider/callback/processing policy is unapproved is intentional; no migration is needed for this bounded prototype.

All three real assurance checks—document authenticity, live liveness and face-to-document match—remain unimplemented and cannot be obtained from a fixture. `futureParticipationEligibility` always denies and is **not connected to marketplace routes**; the old 13B inert guard is unchanged. Therefore no fake verified authority and no new production lockout. Existing trust booleans/strings, staff-human associations and MFA are not eKYC provenance.

[Authentication/eligibility audit](batch13c/AUTHENTICATION_AND_ELIGIBILITY_AUDIT.md) identifies both direct ACTIVE listing creation and ACTIVE reactivation, plus the rental request transaction distinct from quotation/replay. Production publication/request enforcement awaits separately approved trusted outcomes, migration/cutover and transactional consistency. Existing ordinary marketplace functionality remains under its previous rules.

Full boundary/threat model: [contracts and security](batch13c/CONTRACT_AND_SECURITY.md). Exact development-only flag, actual owned database/run marker, matching safe URLs, current ACTIVE actor/session, exact localhost Origin/custom CSRF header, private/no-store DTO, unknown selector/field/attestation refusal and production proxy/service denial are independent checks. A browser state/cookie/body or provider-looking environment variable grants nothing.

## Verification

- TypeScript, lint (no warnings), Prisma validation and 136/136 unit tests pass.
- 18/18 final selected isolated command groups pass; [exact ledger](batch13c/regression-ledger.json) records command, run ID, timing, exit and cleanup.
- Native browser login and account entry, all scripted outcomes through actual HTTP, cross-account/incarnation isolation, forged identity/callback refusal, exact Origin/header/input bounds, stale/concurrent transition conflicts, actual logout/expiry/suspension denial and actual booking-scope checks.
- Real challenge completion/replay denial, no generated MeetupEvent, no synthetic custody transition or trusted user verification flag. Exact 5m/120s/30m boundaries use the same pure engine with deterministic clocks; no real provider or wall-clock-duration test claimed.
- Original `test:integration`, `test:meetup-session`, `test:login-readiness`, authorization/staff-session/MFA/Admin, rental API/browser, account-security, chat, Support channels/scoped staff (including 13A companion), original migration and normal build groups rerun.
- Full `test:meetup`:12/12, including genuine virtual-camera pickup and return decoding; [pickup](batch13c/camera-pickup.json) / [return](batch13c/camera-return.json) diagnostics retained.
- Initial failures and corrections are separate: [verification notes](batch13c/VERIFICATION.md), [initial outcome ledger](batch13c/initial-outcomes.json). A screenshot-before-hydration failure was corrected by waiting for the existing shell readiness signal. The strict collector was not suppressed; no assertion timeout/deadline was increased. The earlier first browser run had passed.

Selected passes do not establish biometric accuracy, global regression completion, full accessibility or resolution of the historical overlapping-workload login timing issue. No provider quality, matching accuracy, cost or production outcome is available.

## Preservation, policies and remaining work

[Preservation hashes](batch13c/preservation.json):106 core/historical files unchanged, including all schema/migrations/lockfile, original auth/booking/listing/meetup/inspection/Support/staff/AI code, camera assertions and browser collector. Original14 stage objectives and Stage 6–9 sections unchanged. [Cleanup](batch13c/cleanup.json) verifies zero remaining owned 13C DBs or marked test principals after changing runs; test-run records additionally confirm their own cleanup. [Populated historical migration evidence](batch13c/migration-evidence.json) confirms preserved history/security tables, booking/listing foreign keys, private evidence bytes, checksums and empty schema diff. No application DB is adopted/reset/migrated. [Complete changed-file inventory](batch13c/CHANGED_FILES.md).

[Privacy/document/operations design](batch13c/PRIVACY_DOCUMENTS_AND_OPERATIONS.md) covers intended Taiwan ID/ARC versions and provider capabilities, future exact country/version registry, minimal result retention, restricted manual review, accessible alternatives, appeals, revocation/recovery and incident responsibilities. Document/biometric capture, vendor processing/terms/cost, legal basis/consent/transfers, retention/deletion, reviewer scope/independence, callback/key/replay design, expiration/duplicate identity, notification and production cutover remain unresolved. No government database or OCR-based authentication claim.

The [product blueprint](../product/HUSTLEN_AI_PRODUCT_BLUEPRINT.md) records all three required future assurance checks and preserves24h owner inspection /48h borrower response. Durable structured claims, borrower responses, qualifying delivery, enforceable response deadlines, extensions/appeals, settlement and production dispute cutover remain blocked. No Support production access, station controls, publishing/settings approvals or Stage 9 acceptance is silently completed.

The [canonical roadmap](../roadmap/MASTER_ROADMAP_14_STAGES.md) remains14 stages; Stage 10 **In Progress**.13C is a trust/identity foundation increment with dependencies in existing security/account/marketplace/pilot stages, not a new stage or AI executor. Owner/Borrower AI, live Vision/eKYC and actual biometric challenges wait for explicit later review. [Setup and next decisions](batch13c/SETUP_AND_ACCEPTANCE.md).
