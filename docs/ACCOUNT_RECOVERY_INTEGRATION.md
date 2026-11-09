# Account recovery integration

Validated on 9 November 2026. Integration branch:
`integration/account-recovery-milestones-1-2`.

Canonical foundation: `77aae95e950939483dd1418cf83c5261bc0ed67e`.
Recovery source: `d760ab3d390a57ff180f9a97e700b807e58f51ab`, branch
`recovery/account-recovery-milestones-1-2`, based on `f856dc3`.
The source implementation and its historical audits were retained and reconciled
onto the canonical checkout; the older application tree was not substituted.

## Approved behavior and security reconciliation

- Email recovery is limited to ordinary USER accounts with no staff association
  or reviewer record, including pending/revoked associations or disabled reviewer
  records. Eligibility is checked under the account lock at issuance and reset,
  and again before queued recovery submission. The email address is rechecked after lock acquisition, so issuance never uses an address changed while waiting. A previously issued token cannot
  recover an account after elevation. Account suspension is never removed.
- Registration, recovery reset and authenticated password change share one pure
  raw-string password policy: 8–128 UTF-16 code units, an ASCII uppercase letter
  and an ASCII digit. Passwords are not trimmed. Login still accepts valid legacy
  passwords; current-password verification does not apply the creation policy.
- Canonical session issuance remains authoritative: CredentialChangedError,
  verified-hash snapshots, staff-login routing, cookie settings and session APIs
  are preserved. The canonical login route itself is unchanged.
- One scrypt implementation retains the existing hash format. One advisory lock
  helper retains namespace 1105001 and is re-exported through the existing auth
  interface. Recovery issuance/reset and the email worker use that same lock
  before the account row lock. No database lock is held over provider calls.
- Authenticated password change retains its existing environment/account gates,
  effective-password-reuse refusal, credential/session postconditions and
  immutable security-event transaction. It additionally deletes outstanding
  recovery credentials and cancels pending recovery email in that transaction.
  Notification delivery here remains scoped to recovery resets; this integration
  does not activate notifications on the older password-change candidate.
- Recovery retains hashed expiring single-use tokens, persistent quotas,
  atomic reset/session revocation/notification enqueue, encrypted outbox payloads,
  leased workers, bounded retries, stable provider idempotency keys and terminal
  ciphertext cleanup. ACCEPTED means provider acceptance, not inbox delivery.

## Conflicts resolved

| File | Resolution |
| --- | --- |
| `.env.example` | Append disabled email settings without removing database/meetup configuration; secret fields remain blank. |
| `app/api/auth/login/route.ts` | Preserve canonical file unchanged, including rate limits, generic errors, staff routing and verified-session interface. |
| `components/auth-form.tsx` | Preserve hydration readiness and full-document navigation; apply email-only recovery text and password hints. |
| `lib/auth.ts` | Preserve canonical session helpers and account-status selection; share existing-compatible hashing/locking and add cookie-only reset cleanup. |
| `package.json` | Add recovery/email/migration commands and include the new unit suites; preserve all existing scripts, dependency versions and lockfile. |
| `prisma/schema.prisma` | Add recovery/outbox types, models and User relations while retaining the complete canonical schema. |
| `tests/run-isolated.ts` | Preserve ownership checks, compiler isolation, existing suites and cleanup. Add new dispatch paths; disable inherited live credentials. |

The two source forward migrations are unchanged. No pre-existing migration was
edited. The original source tests replayed historical migrations in alternate
schemas, which is incompatible with canonical security triggers intentionally
targeting public objects. Populated-upgrade verification now has its own fresh,
runner-owned database and staged migration configuration. No trigger or security
assertion was disabled to make the integration pass.

Existing policy-test fixtures were updated to meet the approved creation policy,
including concurrency and equivalent-UTF-8 credential cases. Assertions still
exercise effective reuse, silent-write failure and rollback. English/Traditional
Chinese password help and client validation use the new policy without changing
the existing visual foundation or adding reset screens.

## Validation

Node 24.19.0, npm 11.x, PostgreSQL 17, installed Chromium. Every database command
used the existing isolated runner and a nonexisting `hustlen_test_*` target.
Each successful run removed only its owned database and recorded uploads.
Simulated provider responses were used throughout; no worker with live provider
credentials was started. Build verification used an initialized owned database.

| Check | Result |
| --- | --- |
| `npm run db:generate` | PASS, Prisma 7.10.1 client generated; no database migration. |
| `npm run typecheck` | PASS, route generation and complete TypeScript check. |
| `npm run lint` | PASS. |
| `npm run test:unit` | PASS, 232 passed, zero failed/skipped. |
| `npm run test:recovery` | PASS: expiry/reuse/supersession, quotas, concurrency, login/reset race, legacy login, privileged exclusion, rollback and rental-data preservation. |
| `npm run test:email` | PASS: encryption, desktop/mobile previews, privacy, retries, worker leases, ambiguous acceptance/idempotency, cancellation, notification rollback/failures and account-elevation suppression. |
| `npm run test:recovery-migration` | PASS: compare all 75 populated canonical tables through the first migration; 77 existing tables through the email migration; schema agreement and repeat deployment preserve every row. |
| `npm run test:password-change` | PASS: gated browser/API flow, recovery cancellation, session concurrency/revocation, rollback and bilingual policy feedback. |
| `npm run test:password-change-production` | PASS: production refuses the owned-development password-change candidate. |
| `npm run test:admin` | PASS, seven tests: persisted roles, read authorization, browser flows and data preservation. |
| `npm run test:moderation` | PASS, ten tests: suspension, listing restrictions, dispute resolution and immutable auditing. |
| `npm run test:account-security-ux` | PASS: browser visibility/focus, concurrent limits, authorization boundaries and audit refusal. |
| `npm run test:account-password-review` | PASS, three tests: effective credential reuse and silent audit/credential-write rollback. |
| `npm run test:integration` | PASS: marketplace desktop/mobile flow, booking/editing races, handoff, return, inspection, disputes and authentication; zero browser errors. |
| `npm run test:rental-api` | PASS, 20 passed, zero failed/skipped. |
| `npm run test:stability` | PASS, eight passed, including auth quotas and fail-closed evidence auditing. |
| `npm run build:verify` | PASS: 35 migrations, full optimized build, TypeScript and static generation. |

Selected current-instance evidence (ignored artifacts, not committed):

- Recovery: `.test-artifacts/faf451ea4edcc65e5538865a/recovery-validation.json`.
- Email: `.test-artifacts/5756611c67500440db7fbfff/email-validation.json`.
- Upgrade: `.test-artifacts/27f5acb446ccf074ce206e44/recovery-migration-validation.json`.
- Password change: `.test-artifacts/fd1aa4e7d64c8ec5326b8454/`.
- Credential review: `.test-artifacts/7ecc26f358a965779e2e48bb/`.
- Marketplace: `.test-artifacts/ed68443ef8d3ca800da2241f/validation.json`.
- Rental API: `.test-artifacts/c7d877f2a4c71f8e3a9e2c51/`.
- Stability: `.test-artifacts/579ac240b1dd957623a9862a/`.
- Production build: `.test-artifacts/1596b0e0058d41e57e12e0f2/`.

## Remaining boundaries

This is code integration and automated validation, not live-delivery acceptance.
Email sending remains disabled by default. Live testing still needs separately
approved recipient/sender/origin settings, a stable encryption key, network access
to api.resend.com and explicit authorization. Dedicated recovery/reset screens
remain Milestone 3 and are not implemented. Registration email ownership
verification is also outside this change.

No shared/development application database or production database was migrated,
reset, seeded or otherwise changed. No real emails were sent. No changes were
pushed, merged into main, deployed or published by this integration task.
