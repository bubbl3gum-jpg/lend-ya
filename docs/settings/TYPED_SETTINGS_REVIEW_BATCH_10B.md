# Typed Platform Settings review — Batch 10B

Status: **functional owned-development configuration candidate, limited to two display settings**. Master roadmap: **Stage 8 — Announcements & Platform Settings**. Production writes/publishing, operational policy editing, new staff roles/grants, approval execution, Support production messaging, station actions, payments and AI administration remain disabled/unapproved. No merge, push or deployment.

**Verification is not fully green:** 52/53 final isolated command groups pass; the legacy MRT logout/polling collector fails on both executed attempts. The new settings candidate, production refusal, migration, build, 90 unit tests and full camera meetup suite pass. This known failure remains a review blocker for an all-green acceptance claim.

## Exact baseline and final revisions

- Branch: `feature/typed-platform-settings-batch-10b`.
- Verified Batch 10A implementation: `44146203549c2e9f2be2bdcdfd2c0ae12fcecaba`.
- Verified separate Batch 10A closeout: `cad0afe51fbdfb00e466ca7b47abab8dc63618b4`.
- Exact final Batch 10A documentation HEAD / clean starting baseline: `9854b24a7189e4172d9b03f1148832c416175550`; both ancestors verified before branching.
- Exact tested Batch 10B implementation: `94eee81b54ebdf85543e515cd96ef0f5b896696f`.
- Separate evidence closeout: `d40bf00f09e3f4ed452abcd39cebf57143002868`.
- This review index is a documentation-only successor, allowing both prior hashes to appear exactly without circular self-reference. Final review HEAD is supplied in the delivery message. No application code changes follow the implementation commit.
- [Complete changed-file inventory](../security/batch10b/changed-files.txt). Final working tree verified clean.

## Implemented functionality and actual configuration audit

All 31 existing read-only entries are preserved; `lib/admin/settings.ts` and every original authoritative source are byte-identical. The [reviewed inventory](REVIEWED_SETTINGS_INVENTORY_BATCH_10B.md) identifies every entry's environmental/static/database source, type, safe effective-value handling, real consumer, hard limits, operational impact, proposed risk and modification prerequisites. [Actual safe effective values from this owned run](../security/batch10b/operational-settings-effective.json) are environment-specific, not production values or guessed defaults. Proposed risk labels do not grant permissions.

System → Platform Settings now combines searchable/grouped read-only operational cards with two scoped development editors. It explains effective/default source, actual stored version, trusted actor and Taiwan time; shows unsaved changes and stale-version feedback; loads immutable history with cursor pagination; and records rollback as a new revision. Browser edits remain tied to their loaded version and cannot silently adopt a concurrent update. No secret, credential, connection string, private allowlist or infrastructure value is displayed.

| Exact key | Validation / code default | Real consumer |
| --- | --- | --- |
| `dev.announcements.visible` | Strict boolean; DB 0/1; default true, version 0 while absent | Authorized development demonstration notice section; warnings and authorization remain visible/enforced |
| `dev.announcements.maxVisible` | Strict integer 1–100; default 100, version 0 while absent | Caps already eligible notices on the same page; original SQL cap/window/audience checks unchanged |

The suggested display examples were useful and retained with explicit development names. These are candidate keys only, not approved production keys or publisher permissions. No original operational setting is made dynamic. Native browser/API tests verify that changing the cap changes the actual rendered notice count; disabling display hides notice bodies; defaults and rollback restore eligible display; and drafts, scheduled/expired notices and unauthorized audiences remain excluded.

## Storage, atomic history and fallback

`prisma/schema.prisma` adds DevDisplaySetting and DevDisplaySettingEvent plus two reverse User relations. Forward-only `20261026100000_typed_display_settings_candidate/migration.sql` creates only new objects in a transaction, seeds no settings/staff and edits no historical migrations or existing columns. Exact identifier/type/range checks, immutable policy/key, actor/resource FKs, unique request UUID and `(key,version)`, monotonic versions and deferred effective-row/event linkage are database-enforced. Events validate previous values and same-key rollback targets. UPDATE/DELETE/TRUNCATE history and DELETE/TRUNCATE effective values are denied.

`lib/platform-settings/registry.ts` defines the two identifiers, types, bounds, defaults, fixed policy and strict SET/ROLLBACK contracts. `service.ts` loads exact keys only. Each mutation authenticates the current ACTIVE legacy Admin and settings tester, validates the exact key/shape/value/version, serializes request and first-insert/key races, rechecks persisted session/account, then commits effective value and immutable attributed event atomically. Same requestId/actor/canonical payload returns the original version; conflicting payload or stale version returns 409. Lock wait is bounded at 1500ms with the existing Prisma transaction deadline; there is no automatic retry loop. Rollback loads a retained same-key value/default, validates it under the fixed current policy and creates a new version. No value/history deletion, version decrement or reversal of another intervention is possible.

Stored audit data is fixed non-secret scalar transitions, trusted actor, key/action/versions, actual DB time, requestId and canonical hash. No arbitrary JSON, raw request, notice body, credential, raw GPS or private case content. Exact-key history pages expose only the attributed transition DTO, excluding request hashes/tokens.

Consumer resolution is server-side and uncached. Gate off preserves the prior default display without reading candidate tables. Missing rows under a valid owned gate use explicit code defaults/version 0 with no invented timestamp/actor/event. Valid stored rows expose actual persisted values. Invalid/unavailable configured storage hides notices with an unavailable state and bounded diagnostic logging; it does not silently enable defaults or change eligibility. A repeatable-read snapshot resolves the two independent display controls. Loaded pages and in-flight requests are snapshots; refresh requests see committed values, not instant push delivery.

See the complete [lifecycle/history/fallback and setup/cleanup contract](TYPED_SETTINGS_CONTRACT_BATCH_10B.md).

## Authorization and production isolation

Existing ACTIVE legacy Admin read access remains. Candidate API/editor has an **independent** exact flag (`HUSTLEN_SETTINGS_CANDIDATE=owned-display-only`), pinned development origin, own explicit actor allowlist, strict local disposable target/driver validation, exact live DB/run ownership marker and valid trusted session. Announcement flags/allowlists alone cannot enable settings writers. Audience readers need their own announcement authorization, not settings-writer authority. Browser-provided role, actor, risk, policy, assurance, unknown keys/fields or selectors are rejected.

`app/api/admin/platform-settings/route.ts` uses the unchanged adminApi guard, private/no-store, Vary Cookie, bounded strict JSON, exact Origin/Host and cross-site refusal. Services perform independent checks and transaction-time identity/session rechecks. Production refuses candidate reads/writes even with a configured development flag; authorized legacy Admin read-only pages remain available. No changes to proxy/CSRF, authentication/session issuance/logout, existing staff/MFA/approval services or new membership/grant activation.

Original announcement service, API, schema lifecycle constraints and historical migration are unchanged. `app/dev/announcements/page.tsx` applies presentation controls **after** the original server-time eligible query; it does not accept client audience/time or change DRAFT/PUBLISHED/ARCHIVED transitions, text escaping, expiration, withdrawal, test-only audience or notification behavior. No actual external notification/publishing statistics exist.

## Responsive browser evidence

Actual Chromium used real application routes and persisted rows for editing, conflict/reload, version history, rollback and consumer refresh. Desktop 1440×1000, tablet 820×1180 and mobile 390×844 exercise native controls/unsaved feedback, search, history and overflow; keyboard focus and Asia/Taipei formatting are checked. Only the Next developer overlay is omitted. Physical-device/screen-reader certification is not claimed.

| Viewport | Editor overview | Full inventory and history |
| --- | --- | --- |
| Desktop | [controls](../security/batch10b/settings-controls-desktop.png) | [full page](../security/batch10b/settings-editor-desktop.png) |
| Tablet | [controls](../security/batch10b/settings-controls-tablet.png) | [full page](../security/batch10b/settings-editor-tablet.png) |
| Mobile | [controls](../security/batch10b/settings-controls-mobile.png) | [full page](../security/batch10b/settings-editor-mobile.png) |

[Persisted transition / consumer evidence](../security/batch10b/settings-contract-evidence.json) · [Production refusal](../security/batch10b/production-refusal.json) · [Migration preservation](../security/batch10b/migration-preservation.json).

## Actual verification ledger

| Exact command | Actual final result |
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
| `npm run test:integration` | Exit 1; **FAILED** — known logout/polling 401; both executed attempts failed; owned cleanup confirmed |
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
| `npm run test:platform-settings` | Exit 0; ℹ pass 8; owned cleanup confirmed |
| `npm run test:platform-settings-migration` | Exit 0; ℹ pass 4; owned cleanup confirmed |
| `npm run test:platform-settings-production` | Exit 0; ℹ pass 1; owned cleanup confirmed |
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
| `node node_modules/typescript/bin/tsc --noEmit` | Exit 0 |
| `npm run lint` | Exit 0 |
| `npm run test:unit` | Exit 0; 90/90 passed |
| `node node_modules/prisma/build/index.js validate` | Exit 0 |
| `npm run test:camera-reader` | Exit 0; 1/1 passed |

[Full machine-readable ledger](../security/batch10b/verification.json) records actual command/start/end/exit/count/artifact and ownership cleanup. Every changing test used a fresh absent owned disposable DB. No existing application or retained demo DB was a migration, fixture, reset or cleanup target. No timeout/assertion/GPS/camera/consent/evidence/booking/staff constraints were relaxed.

The full meetup regression passes **11/11**, including genuine virtual-camera QR decoding at both pickup and return. Manual fallback and camera negatives remain separate checks. Safe evidence: [pickup](../security/batch10b/camera-pickup.json), [return](../security/batch10b/camera-return.json), [camera negatives](../security/batch10b/camera-negative-evidence.json), [post-return checkpoint](../security/batch10b/investigation-qr-receipt.json). No QR payload, evidence image or raw coordinates are committed.

New coverage includes default values, two exact keys, invalid types/ranges/critical keys, forged actors/roles/risk/policy, authorization and allowlist separation, suspended/expired sessions, wrong ownership, Origin/CSRF/media types/selectors, version conflicts, concurrent first insert/edits/idempotency, rollback, immutable history, first-insert and update audit-failure rollback, missing/invalid storage, consumer refresh, production flag refusal, responsive actual browser editing/conflict/rollback/history and preserved 31 entries. Normal Batch 10A announcement tests run with the settings gate off, proving prior default behavior and independent environment gating.

Fresh installation is exercised by the isolated suites. Populated upgrade verifies preexisting users, bookings/stations/listings, sessions, reviewers, audits/evidence and an existing announcement+immutable event before/after partial DDL failure, explicit owned-fixture rollback resolution, forward replay and no-op replay. Old trigger definitions, migration rows and full original public rows are compared exactly. It proves schema/data compatibility, not an approved production rollout; inherited owned-only migration-chain deployment remains separately blocked.

## Initial outcomes and reruns

The first new candidate browser/API test passed 7/7 and its migration test passed 4/4. TypeScript then rejected a new test fixture's inferred union of header maps (`TS2345`, optional undefined properties incompatible with `Record<string,string>`). That same test-source typing issue caused the first production/build commands to stop before verification; it was corrected with explicit string-map typing, without changing security expectations, deadlines or application authorization. Subsequent actual production-refusal and build checks pass. Final candidate coverage also adds first-insert audit-failure rollback, overflow-selector rejection and final screenshots; prior 7/7 is not misreported as that later coverage.

Two initial lint warnings identified unused imports, now removed. Code review preserved loaded draft versions across refresh, improved conflict/reload/rollback feedback and made history cursor bounds match the DB integer type. These are candidate correctness fixes, not changes to existing security controls. [Initial outcomes](../security/batch10b/initial-outcomes.json) remain separate from final passes.

The legacy `npm run test:integration` **failed twice**: first `.test-artifacts/deca0bbf1fa904fb7cc9df43`, then one bounded fresh rerun `.test-artifacts/cceb12e4f3c57a1cb1fb9a80`. Both reached the final collector assertion in `tests/mrt-integration.ts:587`; the unchanged fixture left a booking page open while calling logout/login APIs. The server sequence was logout 200 → background meetup-status 401 → failed-password login 401 → successful login 200. `tests/support/browser.ts:collectBrowserErrors` records the unauthenticated background poll as an error. [Safe traces](../security/batch10b/legacy-mrt-logout-polling.json) retain both actual attempts. This reproduces the issue reported in Batch 10A, remains **UNRESOLVED**, and is not attributed to announcement/settings/MFA/camera changes. No third blind rerun, collector exception, timeout increase or auth/polling code change was made. No recurring chat-login or synthetic-camera failure appeared in the executed suites.

A mid-task sandbox policy change additionally blocked five final commands at tsx IPC startup (`EPERM`), before harness/DB creation. They are recorded separately as environment interruptions, not executed application regressions or cleanup failures. Reviewed sandbox permission allowed the actual final runs. The read-only final Git preservation tool needed the same permission; its successful audit is retained. No automatic approval review rejected an action, and no production access or publishing was requested.

## Preservation, approvals and next work

[Baseline preservation](../security/batch10b/baseline-preservation.json) verifies all **27 historical migration SQL files**, official MRT catalogue, Locations/Lab, original inventory adapter, original announcement lifecycle/API and all existing auth/staff/MFA/approval/Support/rental/chat/moderation/evidence services are byte-identical. Existing Prisma definitions remain unchanged apart from two additive reverse User relations; no legacy records or roles are converted. Existing proxy, CSRF and navigation are byte-identical. The announcement browser fixture only adapts metadata heading lookup from h2 to h2/h3 for the new semantic inventory hierarchy; no existing assertion or deadline is weakened. Authorization inventory adds only the new guarded route.

[Owned cleanup](../security/batch10b/cleanup.json): **0 remaining Batch 10B databases; 0 remaining owned test principals**, confirmed in a read-only maintenance transaction. Ignored diagnostics remain local for review; only safe fixture metadata/screenshots are committed.

[Product approval decisions](PRODUCT_DECISIONS_BATCH_10B.md) remain outstanding for exact routine production keys/authorized humans, routine publishing/audience, high-impact/emergency separation, configuration approval/rollback, retention/audit readers, real kill switches, notification/localization and operational-policy migration. The two display controls are not production kill switches. DB owner/superuser remains a trusted infrastructure boundary; no production least-privilege publisher/configuration principal is provisioned.

The [canonical 14-stage roadmap](../roadmap/MASTER_ROADMAP_14_STAGES.md) updates Stage 8 progress only; all original names/order/objectives and Stage 6/7 sections are preserved. Stage 6 still lacks authorized station suspension/restoration and real field/Operations readiness. Stage 7 retains its unresolved production policies and activation gates. No stage becomes Production Ready from candidate tests.

Recommend a separately approved [Stage 9 account-settings/UX read-model and visual slice](STAGE_9_RECOMMENDATION_BATCH_10B.md): audit existing account/profile/name/password flows first, then accessible responsive design and light/dark themes with explicit language/fallback policy. Do not put user theme preferences into the operational registry or bundle recovery, mandatory MFA, staff powers, production Support, custody or payments into visual polish. Stop here for independent review.
