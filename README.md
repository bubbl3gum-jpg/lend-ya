# Lend-Ya

Lend-Ya is a booking-based peer-to-peer marketplace MVP built with Next.js, Prisma, and PostgreSQL. A Booking owns the rental lifecycle; handoff, return, and dispute records are attached directly to it.

## Local development

1. Install dependencies with `npm ci`.
2. Start PostgreSQL with `docker compose up -d`.
3. Set `DATABASE_URL` in `.env`:

	```text
	DATABASE_URL="postgresql://p2p_user:p2p_password@localhost:55433/p2p_marketplace?schema=public"
	```

4. Apply migrations, generate Prisma Client, and seed demo data:

	```bash
	npx prisma migrate deploy --config prisma7.config.ts
	npx prisma generate --config prisma7.config.ts
	npx prisma db seed --config prisma7.config.ts
	```

5. Start Next.js with `npm run dev` and open <http://localhost:3000>.

The seed creates local demo accounts `alice@example.test`, `bob@example.test`, and `charlie@example.test`. Their development password is `LocalDev123!`. Do not use these credentials outside local development.

## Booking lifecycle

`PENDING -> CONFIRMED -> HANDOFF_PENDING -> IN_USE -> RETURN_PENDING -> INSPECTION -> COMPLETED`

Participants can open a dispute after confirmed receipt, during use or return review, moving the Booking to `DISPUTED`. Cancellation is limited to pending or confirmed bookings. Handoff and Return each have at most one record per Booking.

## Migration history

The original migrations are retained as immutable history. The forward migration `20261006150000_booking_lifecycle_backbone` converts legacy requests and transactions to Booking records, carries over handoffs and disputes where possible, then removes the parallel legacy tables. Legacy listings receive Taipei Main Station as a migration fallback because the old schema had no meeting-station data.

A fresh database should use `prisma migrate deploy` to apply the complete history and arrive at the current Booking-based schema. A previous local workspace used `db push` and was baselined only after verifying its schema against Prisma. Fresh cloud databases use the complete migration history; do not apply that historical baseline procedure to an arbitrary existing database. Do not replay the historical migrations against a `db push`-created database without first verifying and baselining that database.

The `20261012120000_physical_listing_media_reports` migration deactivates legacy service listings, removes service listing types, and adds category details, listing media, and basic listing reports. New listing photo and video files are stored outside the public directory under `storage/listings` and served through database-aware handlers. Legacy `/uploads/listings/` URLs are rewritten through the same authorization handler; existing legacy files are preserved; this MVP storage is not durable on ephemeral hosts and should be replaced with persistent object storage before production deployment. Uploaded files are excluded from Git.

## Rental evidence and lifecycle

Rental input/display timezone is explicitly Asia/Taipei; billable days round up elapsed 24-hour periods, with a 90-day maximum. Pending requests may overlap. Acceptance locks/rechecks the listing and rejects conflicting reservations. Handoff starts with owner evidence and explicit acknowledgement, then borrower receipt confirmation; return submission is borrower-only. Owner inspection saves separate evidence and either completes the rental or records a concern without completing. Eligible participants can dispute an in-use rental or pending return/inspection. Normal APIs cannot resolve disputes.

Condition checklists support yes/no/not applicable/unknown. Photos are JPEG/PNG/WebP, at most eight per submission, 5 MB each, 20 MB combined, and 4096 × 4096 input dimensions. The server decodes/re-encodes uploads and stores sanitized bytes transactionally in PostgreSQL, behind participant-only `/api/bookings/[id]/evidence/[photoId]` retrieval. Database backup/restore must include this evidence. Legacy external photo references are retained, but require a separate secure import before protected viewing; old overwritten statements cannot be reconstructed.

## Admin Desktop and moderation

Register your own local account with your own credentials through `/register`, then promote that existing account:

```bash
npm run admin:create -- your-email@example.test
```

Without an argument the script prompts for the email in an interactive terminal. It refuses production and non-local database hosts, does not set/reset a password, and has no public HTTP equivalent. Do not promote a public demo-password account for real administrative use. Sign in through `/login`: administrators go to `/admin`, ordinary users go to `/dashboard`.

The Admin Desktop has overview, users, listings, bookings, reports, disputes and immutable audit logs. Every page/API verifies the current persisted server session, ADMIN role and active account status. Existing directory APIs remain read-only; dedicated moderation/resolution endpoints validate reasons and current states, reject cross-origin browser writes, and atomically persist decisions and audit records. Private participant evidence endpoints retain their participant-only policy; administrators use case-scoped `/api/admin/disputes/[id]/evidence/[photoId]` handlers for investigation.

Suspension blocks new listings, edits/deletion, bookings, booking acceptance, new owner handoff and reviews. It hides the suspended owner's listings from public browsing while preserving account login, rental history, existing borrower receipt confirmation, cancellation/rejection before handoff, returns, inspections, disputes and safety reports. Permissions are rechecked from PostgreSQL and serialized against suspension inside new-activity transactions. Reactivation leaves previous audit history, moderated listings and rental evidence intact.

Listing moderation uses an `adminRestricted` flag separate from owner-controlled ACTIVE/INACTIVE. Owner edits cannot remove restrictions. Restoration removes only that flag; owner inactivity/suspension, unresolved reports, missing photos and reservation conflicts still govern eligibility. Dismissing one report removes only its blocking effect; upholding a report restricts its listing. Existing bookings are never silently cancelled.

Dispute findings are no actionable issue, issue confirmed or insufficient evidence. After reviewing a valid bilateral handoff, administrators explicitly choose: continue return obligations if no return exists (`IN_USE`); resume unrecorded owner inspection for a submitted return (`RETURN_PENDING`); or close an owner-inspected returned rental (`ADMIN_CLOSED`). Administrative closure preserves failed inspection evidence and never fabricates return confirmation, enables verified reviews or settles funds. A new follow-up case may be opened if obligations resume and another concern arises; original cases/decisions remain intact and a database partial unique index permits at most one OPEN case per booking. Use migrations rather than `db push` to preserve custom constraints and immutable-audit triggers. See the [Milestone 4B report](docs/milestone-4b-report.md) for the transition table and exact enforcement policy.

Development seed reruns preserve existing accounts, passwords, roles, listings and rentals; they only fill missing demo records. They never create an administrator or demote an existing one. The demo password applies only to newly created USER demo accounts.

## Verification

Run unit/project checks:

```bash
npm run test:unit
npx prisma validate --config prisma7.config.ts
npx prisma generate --config prisma7.config.ts
npx tsc --noEmit
npm run lint
npm run build
```

Set `MRT_TEST_DATABASE_URL` securely to a **nonexisting** local database named `hustlen_test_*`, distinct from the development `DATABASE_URL`. Do not create or migrate it yourself: the isolated runner creates, marks and removes it, refusing existing databases. The PostgreSQL role needs create/drop permission. Set `MRT_BROWSER_PATH` and `CHROMIUM_PATH` to an installed Chromium executable (cloud: `/usr/bin/chromium`); install FFmpeg/ffprobe for media tests.

```bash
npm run test:unit
npm run build:verify
npm run test:migration       # populated full Admin/MVP -> combined
npm run test:admin-migration # older pre-moderation -> combined
npm run test:integration     # MRT UI, booking, editing and concurrency
npm run test:rental-api
npm run test:rental-browser
npm run test:admin
npm run test:moderation
npm run test:mvp
```

Run these sequentially; the target name can be reused after successful cleanup. Each run uses its own database ownership marker, generated dev output and dynamically allocated ports. Private evidence, audit immutability and historical records are checked within those isolated fixtures. Test artifacts live under ignored `.test-artifacts/`. A normal `npm run build` reads the bound application database; `build:verify` uses a fresh combined schema instead.

Detailed acceptance, exact files, results and limitations: [Milestone 3](docs/milestone-3-report.md) and [Milestone 4A](docs/milestone-4a-report.md) and [Milestone 4B](docs/milestone-4b-report.md). The older Milestone 2 report retains its original blocked run and points to the newer verified results.


## MVP hardening and release decision

Milestone 5 independently reran the rental, administration, dispute and migration scenarios and added account/marketplace security and browser tests. The release decision is **MVP CONDITIONALLY READY**: supported workflows are demonstrated, while dependency advisories, hosted CI execution and fresh-host backup restoration remain documented conditions. See [the final report](docs/milestone-5-report.md), [security assessment](docs/security-assessment.md) and [university demonstration guide](docs/demo-guide.md).

Listing photos are actually decoded, bounded to 4096 × 4096 input dimensions/16 MP, stripped of metadata and resized inside 2048 × 2048. MP4/WebM uploads require ffprobe to validate a supported video stream using a pipe-only protocol whitelist and timeout. New media lives in `storage/listings`, excluded from Git. Active public listings' media can be viewed publicly; inactive/restricted/suspended-owner listing media requires the owner, an active ADMIN or a related booking participant. Deleted and unreferenced files return 404 even if their bytes remain on disk. New responses use no-store; bytes previously viewed publicly cannot be retroactively revoked. Legacy static paths pass through the same handler. Next image optimization is disabled to prevent private media from being fetched without session cookies or retained by its cache.

All API mutations reject hostile Origin/Fetch Metadata headers. JSON input is streamed with a 32 KB limit; listing multipart bodies are bounded even without Content-Length. Authentication attempts are persisted in PostgreSQL: 10 login or 5 registration attempts per normalized email per 15 minutes, plus a 1000-attempt global ceiling per action. Successful attempts count as well; Retry-After is returned when blocked. Caller-supplied IP headers do not bypass these counters. This is an MVP throttle, not a production distributed abuse-prevention service. Session responses are private/no-store; production cookies are Secure, HttpOnly and SameSite=Lax. Login deliberately performs a password derivation for unknown emails as well as existing accounts.

Owners can edit categories, category details and pickup stations atomically, as well as prices/status/text. Existing booking price/deposit/station snapshots remain unchanged. Public listing APIs omit owner email/account-status details. Completed rentals' received reviews appear on the correct public profiles; weighted trust scoring and identity verification are still deferred.

The PostgreSQL `AuthRateLimit` model is added by forward migration `20261014030000_mvp_security`; existing user/rental/audit data is untouched. The scoped `prisma -> mysql2 3.24.6` override fixes MySQL transport advisories without changing Prisma/Next major versions. Nine advisory-bearing package entries remain across the deepmerge-ts and braces toolchains; see the security report for reachability and compatibility limits. No clean vulnerability audit is claimed.

`.github/workflows/verify.yml` installs locked dependencies, provisions isolated PostgreSQL databases and browser/media tools, runs checks/build/tests sequentially and captures audit evidence. Its YAML/steps were validated locally; hosted execution has not occurred. Optional test environment variables are `TEST_DATABASE_URL`, `TEST_API_PORT`, `TEST_BROWSER_PORT`, `TEST_ADMIN_PORT`, `TEST_MODERATION_PORT`, `TEST_MVP_PORT` and `CHROMIUM_PATH`; connection values stay in private environment configuration. The MVP suite rejects pre-existing users and only clears its dedicated fixture database after acquiring ownership of an empty-at-entry dataset.

## Combined Admin/MVP and official MRT branch

`integration/hustlen-mrt-complete` combines Admin/MVP with all 120 official physical MRT locations (136 codes). See the [combined integration report](docs/combined/INTEGRATION_REPORT.md) and [safe Mac upgrade guide](docs/combined/MAC_UPGRADE.md). Preserve all historical migrations. Run `npm run db:preflight` against an existing Admin/MVP database before deploying; do not reset it.

Database integration tests now require an explicit **nonexisting**, disposable `MRT_TEST_DATABASE_URL` named `hustlen_test_*`, distinct from `DATABASE_URL`, with local PostgreSQL create/drop permission. The runner owns and deletes that new database. Set `MRT_BROWSER_PATH` / `CHROMIUM_PATH` to a Chromium executable; install ffmpeg for media/security tests. `npm run test:migration` checks populated Admin-to-combined upgrade; `npm run test:integration` checks MRT browser/API flows. Admin, moderation, rental API/browser, MVP security and historical migration checks have separate `test:*` scripts. `npm run build:verify` builds using a fresh isolated combined database.
