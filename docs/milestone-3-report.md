# Milestone 3 — verified rental lifecycle

2026-10-13. The normal two-user rental workflow and failed-inspection/dispute alternative work through the actual application and PostgreSQL. Earlier Prisma/font access blockers are resolved. Existing booking tests, lifecycle API/security tests, and browser tests pass. Milestone 4A was subsequently explicitly requested and is reported separately in `milestone-4a-report.md`.

## Implementation and database changes

The owner submits a condition record for a confirmed booking, explicitly acknowledges it, and starts `HANDOFF_PENDING`. Only the borrower can confirm receipt; the borrower’s notes, checklist and photos are saved separately before `IN_USE`. Only the borrower submits a return. The owner enters inspection, records a separate inspection statement and explicit acceptable/problem decision, and completes only an acceptable return. A failed inspection remains `INSPECTION`, preserves the concern, and offers the existing dispute workflow. Decisions are immutable through normal APIs.

All lifecycle writers coordinate on the Booking row with a PostgreSQL row lock and database transaction. Existing unique handoff/return constraints remain intact. Completion and dispute creation serialize on the same record; concurrency tests verify exactly one coherent outcome. Existing review uniqueness, rating/self-review constraints and eligibility trigger are retained.

Checklists require all five items and allow `yes`, `no`, `not_applicable`, and `unknown`. Notes remain bounded to 2,000 characters; the optional owner serial number is bounded to 120. User confirmation starts unchecked; the UI never substitutes `true` automatically. Owner/borrower/inspection statements remain separate. The booking page renders notes, checklists, serial number, identities, confirmation times, photos, prices and cancellation history. Reviews are visible and duplicate submission forms disappear after persistence.

Photos are private PostgreSQL `BYTEA` records, saved in the same transaction as their stage. No private evidence files are placed in `public`, and a failed transaction leaves no orphan photo. JPEG/PNG/WebP uploads are decoded and re-encoded with Sharp, stripping metadata and rejecting malformed, mismatched, oversized and unsupported content. Limits: eight still photos per submission, 5 MB per file, 20 MB combined, 4096 × 4096 input pixels; sanitized output fits within 2048 × 2048. Request bodies are capped even without Content-Length. Retrieval checks both booking identity and current participant authorization, and returns private/no-store, nosniff and same-origin headers. Next images use `unoptimized` so browser authentication reaches the protected endpoint.

Forward migration `20261013100000_private_rental_evidence` adds:

- `Handoff.ownerConditionConfirmed`, `borrowerConditionNotes`, `borrowerChecklist`, `borrowerPhotos`.
- `Return.returnConfirmed`, `inspectedBy`, `inspectedAt`, `inspectionAccepted`, `inspectionNotes`, `inspectionChecklist`, `inspectionPhotos`.
- `BookingEvidencePhoto`: UUID, booking/uploader relations, stage, validated MIME type, image bytes and creation time; database format/size/stage checks and a booking/stage index.

It preserves original columns, notes, checklists, timestamps, pricing, completed status records and review protections. Legacy flags are backfilled from existing recorded handoff/return semantics; this does not prove the older UI obtained explicit acknowledgement. Existing completed records use the preserved review eligibility rules. No database reset, destructive migration, payment handling or administrative dispute resolution was introduced. The migration was applied successfully to the local development and isolated test databases.

### Exact Milestone 3 files

Modified: `app/api/bookings/[id]/handoff/route.ts`, `return/route.ts`, `dispute/route.ts`, `reviews/route.ts`, and `[id]/route.ts`; `app/bookings/[id]/page.tsx`; `components/booking-actions.tsx`; `components/site-header.tsx`; `lib/booking-evidence.ts`; `prisma/schema.prisma`; `package.json`; `package-lock.json`; `tests/bookings.integration.test.ts`.

Created: `app/api/bookings/[id]/inspection/route.ts`; `app/api/bookings/[id]/evidence/[photoId]/route.ts`; `components/rental-evidence-form.tsx`; `components/rental-evidence.tsx`; `lib/rental-checklist.ts`; `lib/rental-errors.ts`; `lib/rental-lifecycle.ts`; `lib/rental-route.ts`; `prisma/migrations/20261013100000_private_rental_evidence/migration.sql`; `tests/rental-evidence.test.ts`; `tests/rental-lifecycle.integration.test.ts`; `tests/rental-browser.test.ts`; `scripts/test-rental.sh`; this report. Shared README/test scripts are also documented by the Milestone 4A report.

Sharp is an explicit runtime dependency and Playwright is a development testing dependency. Their installation repaired the previously incomplete optional dependency lock entries; a subsequent frozen `npm ci` succeeds.

## Acceptance table

References correspond to the supplied Milestone 3 request. PASS refers to executed checks; retained historical data limitations are identified separately.

| Requirement | Status | Evidence |
|---|---|---|
| 1–2: operational booking prerequisites and inspect existing defects | PASS | Real registration/listing/booking/acceptance suite; existing code inspected before repair. |
| 3.1–3.4: server transitions, authorized actors, no skipped stages or arbitrary statuses | PASS | API tests reject outsider actions, wrong participant, premature inspection/completion and arbitrary actions. |
| 3.5–3.7: uniqueness, concurrent safety and persistence | PASS | Simultaneous receipt/return/completion tests; one record and one successful transition. |
| 3.8: existing completed record compatibility | PARTIAL | Original columns/status/review trigger retained; no populated pre-migration historical database was available for a separate upgrade fixture test. |
| 3.9–3.10: disputes block completion and evidence survives | PASS | Failed-inspection path and inspection/dispute races; original and inspection notes compared after dispute. |
| 4.1: owner begins handoff, summary, notes/checklist/photos, explicit acknowledgement | PASS | Actual owner browser form and server authorization tests. |
| 4.2: all five structured checklist items; uncertainty/failures | PASS | Unit and persisted API cases cover unknown, not applicable and negative answers. |
| 4.3: borrower reviews and confirms; no impersonation; bilateral IN_USE | PASS | Two separate browser sessions, owner cannot confirm receipt, saved actor IDs/times verified. |
| 4.4: both participants, timestamps, separate evidence and safe migration | PASS | API/photo records and browser reload/restart assertions preserve both statements; migration applied. |
| 5.1–5.2: borrower-only return, explicit acknowledgement and all return evidence | PASS | Actual browser return, wrong-actor/missing-ack/duplicate API tests, persisted checklist/notes/photos. |
| 5.3: owner inspection compares stages, explicit decision, acceptable completion | PASS | Both browser paths; all earlier evidence remains displayed. |
| 5.3: material concerns retained, dispute available, no automatic completion/compensation | PASS | Problem decision remains INSPECTION; dispute changes to DISPUTED; no financial processing code added. |
| 6.1–6.4: booking-bound uploads, participant-only access, no filename/URL bypass | PASS | Outsider/anonymous and cross-booking retrieval denied; admin foundation also lacks private-photo permission. |
| 6.5–6.6: format/size validation and malformed/malicious uploads | PASS | Unit and real multipart tests; valid image with appended script re-encoded without script, malformed/mismatched/SVG/oversize/count cases rejected. |
| 6.7–6.10: retained separate evidence, no orphan files, refresh/restart persistence | PASS | Atomic byte storage, duplicate rollback counts, completed photo retrieval in both contexts after full Next restart. |
| 7: summary, handoff/return/inspection evidence, actors and timestamps | PASS | Actual participant pages rendered and all four statements checked in browser. |
| 7: participant/state actions, loading/errors/disabled inputs, durable-action dialogs | PASS | Role-specific UI, unchecked buttons disabled, explicit form/dialog interactions; server errors and boundaries implemented. |
| 7: responsive and empty states | PASS | 390px mobile completed page fits viewport; empty stage text and existing page loading/error boundaries retained. |
| 8: completed history, irreversible completion, unchanged price, no second handoff/return | PASS | Both dashboards/API histories show completion; repeated stages/cancel/approve/inspect rejected; fee/deposit unchanged. |
| 9.1–9.6: eligible opposing participant, no self/duplicate, bounded ratings/comments, DB reviews | PASS | Both real users submit reviews; wrong subject, outsider, incomplete/disputed, duplicate and invalid input tests. |
| 9.7–9.8: visible reviews and retained database protections | PASS | Booking browser views show both persisted reviews; direct unauthorized review insert is rejected. |
| 10: eligible dispute, validation, correct booking, preserved evidence, DISPUTED/admin-review UI | PASS | Real API and browser alternative path. |
| 10: unresolved dispute blocks completion, no user close/resolve | PASS | Normal inspection/completion/arbitrary resolve rejected; three concurrent inspection/dispute races. |
| 11.1–11.10: authorization/data integrity and safe participant responses | PASS | Real outsider/actor/state/evidence tests; response selects contain no passwords/session credentials. |
| 12: handoff, return, evidence, review, dispute automated cases | PASS | API and unit suites execute against PostgreSQL with isolated accounts/fixtures. |
| 12: full two-user normal and dispute workflows | PASS | Browser login, quoting/booking/acceptance, handoff, receipt, return, inspection, completion, bilateral reviews, reload/restart. |
| 13: boundaries and existing functionality | PASS | Booking architecture retained; regression suite passes. Admin work began only after the explicit subsequent Milestone 4A request. |
| 14: Prisma/migrations/types/lint/build/testing | PASS | Commands/results below; final shared build includes subsequent admin work. |
| Definition of Done 1–13 for newly created rentals | PASS | Real API and two-user browser workflows, persisted PostgreSQL records and regression checks. |
| Old external HTTPS photo references | PARTIAL | Preserved in old JSON fields but not imported/displayed as protected uploads. No unknown remote URL is fetched or made newly public. |
| Full administrative dispute resolution | NOT STARTED | Intentionally deferred; the later Admin Desktop foundation also remains read-only. |

## Actual commands and outcomes

All project commands use `/workspace/lend-ya`. The local test database is `lend_ya_booking_test`; connection values are provided through environment configuration, not recorded as administrator credentials here.

- `npm ci --cache /tmp/lend-ya-npm-cache`: PASS, 519 packages installed from the repaired lockfile.
- `npx prisma validate --config prisma7.config.ts`: PASS.
- `npx prisma generate --config prisma7.config.ts`: PASS, Prisma Client 7.10.0.
- `npx prisma migrate deploy --config prisma7.config.ts`: PASS for local development database.
- `DATABASE_URL="$TEST_DATABASE_URL" npx prisma migrate deploy --config prisma7.config.ts`: PASS for isolated test database; subsequent rerun reports no pending migrations.
- `npx next typegen` and `npx tsc --noEmit`: PASS. Initial stale generated route types were regenerated.
- `npm run lint`: PASS.
- `npm run build`: PASS, Next 16.3.8 production compilation/type checking/static generation.
- `npm run test:unit`: PASS, 6 tests, no failures/skips (two timezone and four evidence cases).
- `TEST_DATABASE_URL="$TEST_DATABASE_URL" npm run test:integration`: PASS. The script owns its API server and runs 13 booking/lifecycle tests, then stops it and runs 4 two-user browser tests. No failed/skipped tests.
- Direct `npx tsx --test tests/rental-lifecycle.integration.test.ts` with matching `TEST_BASE_URL` and `TEST_DATABASE_URL`: PASS, 7 tests.
- `TEST_DATABASE_URL="$TEST_DATABASE_URL" npx tsx --test tests/rental-browser.test.ts`: PASS, 4 tests; rerun after UI changes.
- `git diff --check`: PASS.

Concurrency: one successful receipt, one successful return, one successful completion, and exactly one winner in each of three inspection/dispute races. Simultaneous conflicting booking acceptance also passes. Review tests execute through normal APIs and PostgreSQL; no lifecycle status is manually assigned to simulate a successful Milestone 3 workflow. Earlier booking regression fixtures now advance through the actual lifecycle APIs too.

Intermediate browser failures were investigated: selects needed role-based accessible-name locators; lazy images needed scrolling before checking decoded pixels; a real mobile navigation overflow was repaired. The final assertions still verify all saved photos decode after restart and the layout has no document overflow.

## Limitations and next administration work

Private evidence depends on PostgreSQL backup/restore and consumes database storage; no local private file pipeline or new cloud storage service exists. Optional listing media still uses the pre-existing local public directory, whose durability limitations remain in README.

Legacy external photo references cannot be retroactively protected by this application. Importing them requires a separately reviewed source/access/migration process. Old condition notes overwritten before this repair cannot be reconstructed. Legacy unfinished handoffs with reversed actors or missing valid owner acknowledgement are not silently advanced; they need explicit remediation rather than invented confirmations. A populated historical database upgrade was not tested.

Milestone 4 administration needs report moderation, validated dispute outcomes, user enforcement, booking oversight, explicitly authorized evidence inspection, and durable actor/reason/before-after audit logs. No dispute resolution, payment/deposit adjustments or fake support decisions were added. The separately requested Milestone 4A establishes only read-only views and access control.
