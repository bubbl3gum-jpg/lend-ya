# Announcements & Platform Settings review — Batch 10A

Status: **functional owned-development announcement candidate; read-only settings inventory; production mutation/publishing disabled.** Master roadmap contribution: **Stage 8 — Announcements & Platform Settings**. No merge, push, deployment, existing application-database changes, real staff activation, Support production enablement, approval execution or AI administration.

## Exact revisions and baseline

- Branch: `feature/announcements-settings-foundation-batch-10a`.
- Verified tested Batch 9A implementation: `df375807e7bdd0e4b2956fa54847bed8d5e42eac`.
- Exact subsequent Batch 9A evidence closeout / clean parent: `87010119026af1d04fa0fd63f378f10c90d2011a`; ancestry verified before branching.
- Final Batch 10A implementation: `44146203549c2e9f2be2bdcdfd2c0ae12fcecaba`.
- Separate immutable evidence closeout: `cad0afe51fbdfb00e466ca7b47abab8dc63618b4`.
- This report is indexed in a documentation-only successor so it can contain both exact prior hashes without a circular self-reference. The final review-index HEAD is supplied in the delivery message; no application code changes follow the implementation commit.
- [Complete changed-file inventory](../security/batch10a/changed-files.txt). Working tree verified clean at final delivery.

## Existing-system audit and resulting behavior

Before this batch, the Admin shell, legacy guards, read models and audit conventions existed, but no persisted announcement model, announcement directory, publication pipeline, public notice placement, notification provider/outbox or Platform Settings workspace existed. Marketplace/account settings and private chat delivery are separate systems; they do not provide announcement targeting or external notification delivery.

Community → Announcements now opens a real persisted directory and history. An allowlisted owned-development Admin can create a draft, revise it, preview escaped text, publish immediately or schedule an explicit window, inspect scheduled/active/expired notices, archive a draft and withdraw a published notice. Published content/windows are immutable; corrections begin with another draft. Every mutation returns a recorded database revision or a clear failure; no invented success or reader/delivery statistics.

System → Platform Settings now lists 31 safe read-only entries (26 explicit rows and five generated development-gate rows). It shows authoritative source, expected type, operational effect and proposed future risk classification. Validated effective values come from existing helpers; invalid/missing configuration displays unavailable. No secrets, raw environment enumeration, account allowlist values, tokens, credential material or private infrastructure addresses are exposed. The directory has no write endpoint or generic key-value editor.

Files and contracts:

| Area | Exact implementation / review source |
| --- | --- |
| Announcement schema / forward migration | `prisma/schema.prisma` (Announcement, AnnouncementEvent and reverse User relations); `prisma/migrations/20261026090000_announcement_candidate/migration.sql` |
| Input / lifecycle / publication | `lib/announcements/input.ts`; `lib/announcements/service.ts` |
| Owned gate / effective connection target | `lib/announcements/config.ts`; unchanged `lib/disposable-database-url.ts` |
| Admin page / API / native browser controls | `app/admin/announcements/page.tsx`; `app/api/admin/announcements/route.ts`; `components/admin/announcements.tsx` |
| User-facing controlled demonstration | `app/dev/announcements/page.tsx`; additive refusal in `proxy.ts` |
| Settings read model / page | `lib/admin/settings.ts`; `app/admin/settings/page.tsx` |
| Navigation | `components/admin/navigation.tsx` (two additive links; old routes preserved) |
| Tests / owned runner | `tests/announcements*.ts`; additive `tests/run-isolated.ts` modes; `package.json` scripts |
| Existing authorization inventory | `docs/admin/ADMIN_ENTRYPOINTS_BATCH_10A.json`; additive inventory/nav assertions only |

See the [persisted lifecycle/history/visibility contract](ANNOUNCEMENTS_CONTRACT_BATCH_10A.md), [source/type/risk inventory](../settings/PLATFORM_SETTINGS_INVENTORY_BATCH_10A.md), [product decisions](PRODUCT_DECISIONS_BATCH_10A.md) and [concrete Batch 10B plan](../settings/BATCH_10B_CONFIGURATION_PLAN.md).

## Lifecycle, scheduling and history evidence

Candidate audience is exactly `OWNED_TEST_ADMIN`; production audience/publisher allocations are unapproved. Persistence uses DRAFT / PUBLISHED / ARCHIVED only. Scheduled, active and expired are derived labels, not fabricated delivery states. Text limits 120/4000, years 2000–2100 and a positive ≤31-day window are explicit fixture policy, not production approval. UTC timestamptz is rendered in Asia/Taipei; browser datetime-local fields explicitly convert UTC+08:00 to UTC.

The independent reader query selects only `id,title,body,startsAt,expiresAt`, with state=PUBLISHED, audience=OWNED_TEST_ADMIN and database `statement_timestamp()` within the half-open persisted window. Drafts/future/expired/withdrawn notices are excluded server-side; browser selectors/time do not affect eligibility. No worker is needed for visibility. An already-loaded document remains a snapshot; external delivery/recall needs separate policy and infrastructure.

Mutation authorization is stricter than read authorization: exact development flag, local disposable target, matching connection bindings, effective pg driver target, live owned DB/run marker, pinned origin/host, allowlisted current ACTIVE legacy Admin and actual current session. Exact command schemas reject role/risk/actor/audience/state forgery. The API also rejects missing/wrong Origin, cross-site requests, query selectors and incorrect media types. The production test sets the candidate flag intentionally and confirms mutations/demo still return 404 while authorized read-only inventory remains available.

Each event records exact announcement, trusted actor, fixed action, previous/resulting versions, actual DB time and bounded request hash/key. DB-generated IDs, FK/unique/check constraints, row locks, transaction idempotency locks, deferred revision/event linkage and append-only UPDATE/DELETE/TRUNCATE guards preserve history. Failed event writes roll back create/edit/publication. Lost edits return 409; same command retries return the original revision. History deliberately omits old draft body snapshots and arbitrary request data. Fixture cap reserves a final withdrawal/archive slot.

Confirmed security properties are supported by executed tests below, rather than inferred from new model names. No independent approval or emergency publisher is enabled. DB-owner/superuser control remains a trusted infrastructure boundary; production least-privilege publisher/audit principals and reviewed deployment paths are unfinished.

## Responsive browser evidence

Real Chromium used application routes and persisted rows to create and schedule a notice, render its history and escaped preview, and inspect Platform Settings at **1440×1000, 820×1180 and 390×844**. Labels, keyboard focus, native controls, overflow and Taiwan time were checked. Only the Next developer overlay is omitted from screenshots; application content is unaltered. Full assistive-technology/all-device certification is not claimed.

| Workspace | Desktop | Tablet | Mobile |
| --- | --- | --- | --- |
| Announcements | [desktop](../security/batch10a/announcements-desktop.png) | [tablet](../security/batch10a/announcements-tablet.png) | [mobile](../security/batch10a/announcements-mobile.png) |
| Platform Settings | [desktop](../security/batch10a/settings-desktop.png) | [tablet](../security/batch10a/settings-tablet.png) | [mobile](../security/batch10a/settings-mobile.png) |

[Safe effective-settings snapshot](../security/batch10a/settings-effective.json) · [Persisted history metadata](../security/batch10a/announcement-history.json).

## Actual verification results

| Command | Actual final result |
| --- | --- |
| `npm run build:verify` | Exit 0; command completed; owned cleanup confirmed |
| `npm run test:admin` | Exit 0; ℹ pass 7; owned cleanup confirmed |
| `npm run test:admin-migration` | Exit 0; ℹ pass 1; owned cleanup confirmed |
| `npm run test:admin-own-session` | Exit 0; ℹ pass 6; owned cleanup confirmed |
| `npm run test:announcements` | Exit 0; ℹ pass 9; owned cleanup confirmed |
| `npm run test:announcements-migration` | Exit 0; ℹ pass 4; owned cleanup confirmed |
| `npm run test:announcements-production` | Exit 0; ℹ pass 1; owned cleanup confirmed |
| `npm run test:approval` | Exit 0; ℹ pass 18; owned cleanup confirmed |
| `npm run test:approval-migration` | Exit 0; ℹ pass 4; owned cleanup confirmed |
| `npm run test:authorization` | Exit 0; ℹ pass 8; owned cleanup confirmed |
| `npm run test:case-history` | Exit 0; ℹ pass 8; owned cleanup confirmed |
| `npm run test:chat` | Exit 0; ℹ pass 14; owned cleanup confirmed |
| `npm run test:database-principals` | Exit 0; ℹ pass 7; owned cleanup confirmed |
| `npm run test:execution-rehearsal` | Exit 0; ℹ pass 18; owned cleanup confirmed |
| `npm run test:integration` | Exit 0; command completed; owned cleanup confirmed |
| `npm run test:investigation-receipt` | Exit 0; ℹ pass 2; owned cleanup confirmed |
| `npm run test:locations` | Exit 0; ℹ pass 7; owned cleanup confirmed |
| `npm run test:locations-production` | Exit 0; ℹ pass 1; owned cleanup confirmed |
| `npm run test:login-navigation` | Exit 0; ℹ pass 7; owned cleanup confirmed |
| `npm run test:login-readiness` | Exit 0; ℹ pass 1; owned cleanup confirmed |
| `npm run test:meetup` | Exit 0; ℹ pass 11; owned cleanup confirmed |
| `npm run test:meetup-migration` | Exit 0; ℹ pass 1; owned cleanup confirmed |
| `npm run test:mfa` | Exit 0; ℹ pass 16; owned cleanup confirmed |
| `npm run test:mfa-migration` | Exit 0; ℹ pass 4; owned cleanup confirmed |
| `npm run test:mfa-pilot` | Exit 0; ℹ pass 13; owned cleanup confirmed |
| `npm run test:mfa-pilot-disabled` | Exit 0; ℹ pass 1; owned cleanup confirmed |
| `npm run test:mfa-pilot-production` | Exit 0; ℹ pass 1; owned cleanup confirmed |
| `npm run test:migration` | Exit 0; command completed; owned cleanup confirmed |
| `npm run test:moderation` | Exit 0; ℹ pass 10; owned cleanup confirmed |
| `npm run test:mvp` | Exit 0; ℹ pass 11; owned cleanup confirmed |
| `npm run test:rental-api` | Exit 0; ℹ pass 13; owned cleanup confirmed |
| `npm run test:rental-browser` | Exit 0; ℹ pass 4; owned cleanup confirmed |
| `npm run test:scoped-reads` | Exit 0; ℹ pass 10; owned cleanup confirmed |
| `npm run test:stability` | Exit 0; ℹ pass 8; owned cleanup confirmed |
| `npm run test:staff-migration` | Exit 0; ℹ pass 4; owned cleanup confirmed |
| `npm run test:staff-read-pilot` | Exit 0; ℹ pass 14; owned cleanup confirmed |
| `npm run test:staff-schema` | Exit 0; ℹ pass 8; owned cleanup confirmed |
| `npm run test:staff-session` | Exit 0; ℹ pass 13; owned cleanup confirmed |
| `npm run test:staff-session-migration` | Exit 0; ℹ pass 4; owned cleanup confirmed |
| `npm run test:support-channel-migration` | Exit 0; ℹ pass 5; owned cleanup confirmed |
| `npm run test:support-channel-production` | Exit 0; ℹ pass 1; owned cleanup confirmed |
| `npm run test:support-channels` | Exit 0; ℹ pass 9; owned cleanup confirmed |
| `npm run test:support-staff` | Exit 0; ℹ pass 14; owned cleanup confirmed |
| `npm run test:support-staff-migration` | Exit 0; ℹ pass 5; owned cleanup confirmed |
| `npm run test:support-staff-production` | Exit 0; ℹ pass 1; owned cleanup confirmed |
| `npm run test:support-ticket-migration` | Exit 0; ℹ pass 4; owned cleanup confirmed |
| `npm run test:support-ticket-production` | Exit 0; ℹ pass 1; owned cleanup confirmed |
| `npm run test:support-tickets` | Exit 0; ℹ pass 6; owned cleanup confirmed |
| `npm run test:support-workspace` | Exit 0; ℹ pass 8; owned cleanup confirmed |
| `npm run test:workbench` | Exit 0; ℹ pass 7; owned cleanup confirmed |
| `npx tsc --noEmit` | Exit 0 |
| `npm run lint` | Exit 0 |
| `npm run test:unit` | Exit 0; 87/87 passed |
| `node node_modules/prisma/build/index.js validate` | Exit 0 |
| `npm run test:camera-reader` | Exit 0; 1/1 passed |

[Machine-readable final ledger](../security/batch10a/verification.json) records exact command/start/end/exit/count/artifact/cleanup metadata. Every database-changing test used the ownership-checked isolated harness on a newly created absent local DB, never an application or retained demo DB. No test deadlines, GPS/camera/consent/evidence/booking requirements or existing authorization assertions were relaxed.

The full meetup suite passed **11/11**, exercising actual virtual-camera QR decoding at pickup **and** return, independently of manual-code recovery. Safe evidence: [pickup](../security/batch10a/camera-pickup.json), [return](../security/batch10a/camera-return.json), [camera negatives](../security/batch10a/camera-negative-evidence.json), [post-return receipt checkpoint](../security/batch10a/investigation-qr-receipt.json). No QR payload, evidence image or raw coordinates are committed.

New tests cover draft isolation, actual server-clock start/expiration, half-open unit boundaries, withdrawal, stale concurrent edits, concurrent idempotent retries/payload conflicts, unauthorized/unlisted/suspended/expired actors, forged authority/content/selectors, CSRF/Origin, production flag refusal, event-failure rollback and immutable history. Native browser tests exercise persisted authoring, scheduling, preview, history, layouts, keyboard focus and Taiwan time. The near-limit fixture proves withdrawal can create the final retained event.

The populated migration fixture verifies existing users, booking/station/listing references, reviewer grants, sessions, audit/evidence bytes, old triggers and migration rows before/after an injected failure, explicit owned-fixture recovery, forward replay and no-op replay. Fresh-install coverage comes from all other isolated commands. No production migration was executed.

## Initial failures and corrections — separate from final passes

- First announcement run: **1/7 pass, 6 fail**, retained in [initial outcomes](../security/batch10a/initial-outcomes.json). The transaction advisory-lock query returned PostgreSQL void, which Prisma could not deserialize (P2010). Returning a scalar from the same transaction lock fixed it without weakening concurrency. Dependent workflow checks failed after create failed; they are not separately diagnosed production defects.
- The same first fixture tried restoring an expired session with UPDATE after existing authentication correctly deleted it. The fixture now explicitly recreates that synthetic session; application logout/expiry logic is unchanged. The subsequent fresh candidate run passed 7/7. Later clock-boundary/cap coverage is included in the final run, not backdated into that result.
- An intermediate Prisma generation attempt failed validation when a mechanical reverse-relation edit also touched MeetupEvent. It was removed immediately, before any database operation. Final schema validation and baseline comparison prove all old model definitions remain unchanged except the two additive User reverse fields.
- Code review corrected a candidate revision-cap edge case by reserving a final terminal event, and strengthened nonstring-action/UTC-date/media-type validation. Focused final candidate/migration/production/build checks use these final sources.
- Formatting initially failed because npm's default cache was outside the writable workspace; rerunning with the existing workspace cache succeeded. This was tooling setup, not a database or application failure.

The additional legacy `npm run test:integration` first exited 1 because its page-wide error collector captured a meetup-status 401 **after successful logout and before login completed** (`tests/mrt-integration.ts:587`, `tests/support/browser.ts:collectBrowserErrors`; server trace retained at `.test-artifacts/881d5a138ac95ecd5fa979de/server.log`). Rental/dispute/auth workflow assertions reached the final collector check. One bounded fresh owned retry exited 0 with no source, assertion or timeout change. This logout/polling test intermittence remains unresolved and is not attributed to announcement/MFA/camera code. No recurring chat-login or synthetic-camera failure appeared in these runs.

The final Git audit also caught the already-tested proxy refusal/matcher addition missing from the first staging list. Commit `44146203549c2e9f2be2bdcdfd2c0ae12fcecaba` includes it; the final evidence closeout supersedes the earlier provisional evidence revision. No source bytes were changed for that packaging correction. Final inventory/tree checks confirm every tested implementation file is committed.

## Preservation, remaining blockers and next increment

[Baseline preservation](../security/batch10a/baseline-preservation.json) pins existing source/data/migration hashes. All **26 historical migration SQL files** and the official MRT catalogue are byte-identical. Existing Prisma model definitions remain unchanged; only reverse User relations plus new announcement models are additive. Existing Locations/Lab, Support, auth/MFA, staff/approval, rental/evidence/camera/GPS/QR services and legacy routes remain unchanged. Sidebar adds working Announcements and Platform Settings links. Proxy adds demo refusal/matching without altering prior CSRF/refusal logic. Existing Admin/browser expectations only add those links; inventory tests only add the new guarded route.

[Cleanup verification](../security/batch10a/cleanup.json): **0 remaining Batch 10A databases; 0 remaining owned test principals**, checked using a read-only maintenance transaction. Test principals and uploads are removed by their ownership harness; ignored diagnostic artifacts remain for local review. No production or retained application DB was reset, seeded, migrated or modified.

The original roadmap is now canonical at **[docs/roadmap/MASTER_ROADMAP_14_STAGES.md](../roadmap/MASTER_ROADMAP_14_STAGES.md)**, preserving all 14 stage names, order and objectives supplied by the product owner. It records implemented/remaining scope, relevant batches, evidence, blockers and status per stage; engineering batches do not replace its numbering. **Stage 6** still lacks authorized station suspension/restoration and real field/Operations readiness. **Stage 7** retains its entire production policy/activation tracker. **Stage 8** begins with this candidate and remains unapproved for live publication/configuration writes. No stage is newly declared Production Ready.

Batch 10B should approve exact low-risk IDs and routine publishing policy first, then implement a narrow typed, versioned configuration slice with atomic history and failure/consistency gates. Secrets/security invariants never become arbitrary editable keys. Custody/GPS/evidence/auth/payment changes require independent reviewed source migration and approvals. High-impact/emergency announcements require distinct authorized verified humans, exact proposal binding and live approved execution; a small team cannot bypass separation. External notifications, localization, retention/deletion, production principals and the inherited owned-test migration release path require separate decisions. Stop here for independent review.
