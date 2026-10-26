# Typed display-settings candidate — Batch 10B

Master Stage 8. Development-only functional candidate; no production permissions, publication or policy editing approved. Existing 31 operational settings remain read-only, with their validated helpers and unavailable states unchanged (`lib/admin/settings.ts` is byte-identical to Batch 10A).

## Exact registry and consumer

| Fixed key | Type / hard bounds | Code default / version | Actual authorized consumer |
| --- | --- | --- | --- |
| `dev.announcements.visible` | Boolean only; persisted integer 0 or 1 | true / version 0 when absent | `app/dev/announcements/page.tsx` eligible-notice section. Hides notices only; preserves branding, test warning, authorization and unavailable feedback. |
| `dev.announcements.maxVisible` | Integer 1–100; no strings/floats/null/coercion | 100 / version 0 when absent | Same page, slices already eligible notices. Original SQL hard cap 100 remains unchanged. |

These are deliberately development-scoped identifiers, not approved live policy keys. The user's preferred examples were useful because the existing demonstration already has a concrete eligible-notice section and fixed SQL cap. No substitution to security, audience, custody or operational keys was made. No generic registry extension/JSON endpoint or dashboard key creation is available. The fixed `owned-display-10b-v1` policy cannot be changed by requests.

`visibleCandidateNotices` in the **unchanged** Batch 10A service still authenticates the exact owned test audience and selects only PUBLISHED notices within `[startsAt,expiresAt)` using PostgreSQL `statement_timestamp()`. `demoDisplaySettings()` independently repeats the announcement audience authorization, then resolves only the two display keys. An announcement reader does not need settings-writer authority. A settings writer cannot use display settings to access the audience without the separate announcement gate. Draft/future/expired/withdrawn content remains ineligible regardless of display values or browser time.

There is no cross-request cache, browser storage override, external worker or delivery pipeline. Dynamic server requests read current values. Existing loaded documents remain snapshots; refresh/reload observes committed settings. No remote erasure or instant push updates are claimed. Source constants remain authoritative for every original operational entry.

## Independent gate / exact authorization

`lib/platform-settings/config.ts` reuses strict `announcementConfig` target/driver validation via explicit trusted-environment projection, requiring its **own** exact keys:

- NODE_ENV=development; `HUSTLEN_SETTINGS_CANDIDATE=owned-display-only`.
- `HUSTLEN_SETTINGS_ORIGIN=http://localhost:<explicit port>` (exact origin, no path/credentials).
- Explicit bounded `HUSTLEN_SETTINGS_ADMIN_IDS` allowlist, never displayed.
- Exact DATABASE_URL/TEST_DATABASE_URL/MRT_TEST_DATABASE_URL equality, local `hustlen_test_*` target, 24-hex MRT_TEST_RUN_ID, rejected URL/driver/ambient PostgreSQL overrides, effective pg Client host/port/database checks.
- The actual DB identity and exact `hustlen-mrt-test:<runId>` comment checked on candidate access.

`settingsActor(key)` independently resolves current ACTIVE legacy Admin and validates the key, then requires the exact settings-writer allowlist. Both fixed keys are the only permitted actions for these fixture testers; this is not a production role allocation. Server service boundaries enforce the same checks as HTTP, with transaction-time account and session rechecks. Unknown or critical keys are denied, not assigned a default schema. No ADMIN OR STAFF shortcut, new capability, active role/grant or approval executor integration.

`app/api/admin/platform-settings/route.ts` uses existing `adminApi`, private/no-store and Vary Cookie. GET returns exactly the two registry rows, or one exact key's history with a validated integer cursor. POST requires pinned Origin/Host, same-origin context, application/json and the existing bounded JSON parser; query selectors, unknown fields, client actors/roles/risk/policy/assurance are rejected. Proxy/CSRF and all existing guards are unchanged. Production rejects the candidate service/API even with its flag configured; authorized legacy Admins retain the read-only inventory page. Production does not adopt stored candidate rows or fallback into writes.

## Storage and immutable revisions

Forward-only migration `20261026100000_typed_display_settings_candidate/migration.sql` creates `DevDisplaySetting` and `DevDisplaySettingEvent` and new functions/triggers, inside BEGIN/COMMIT. No prior migration or existing column is edited. Prisma adds only these models and two reverse User relations. No values, staff identities or grants are seeded.

Effective row: exact key PK, encoded typed value, persisted version, fixed policy, trusted actor FK and actual database updatedAt. Event: database UUID, key FK, fixed SET/ROLLBACK action, previous/resulting non-secret typed values and versions, optional rollback target version, fixed policy, trusted actor FK, UUID requestId, SHA-256 canonical command hash and actual DB timestamp. No unrestricted JSON, request dump, notice body, credential, connection URL, raw GPS or private case data.

DB checks bind each key to its own type/range. Ownership guards reject writes outside an owned test DB. Effective versions increment by one; key/policy are immutable. Unique `(key,version)` and requestId, actor/resource foreign keys and deferred mutual event/version checks require atomic effective value + event persistence. Previous values and rollback targets must agree with that key's retained history or its code default at version 0. UPDATE/DELETE/TRUNCATE of events and DELETE/TRUNCATE of effective values are denied. Database owner/superuser can disable triggers and remains a trusted infrastructure boundary; fault injection uses that privilege only inside fresh owned fixtures, never as an application control or production safety claim.

## Update, conflict, idempotency and rollback

Strict SET: `{key,action:"SET",value,expectedVersion,requestId}`. Strict ROLLBACK: `{key,action:"ROLLBACK",targetVersion,expectedVersion,requestId}`. UUID v4 request key; expectedVersion integer 0–2147483646; rollback target integer ≥0 and strictly earlier than expectedVersion. No proposed value is accepted on rollback; it is loaded from the same key's history under current policy and revalidated.

Transaction acquires a request idempotency lock and exact-key lock (including first-insert races), rechecks current persisted session/account, checks canonical request hash/actor, then validates expected version. Same requestId/actor/payload retry returns its original recorded version without another write/event. Another payload/actor with that token or stale expected version returns 409. Lock wait is bounded at 1500ms; transaction is bounded by Prisma's existing transaction timeout. No automatic retry loop exists. Browser retains the same token for an uncertain transport failure; confirmed failures require explicit action/reload. No retry changes policy, key, version or authority silently.

ROLLBACK records a new current version and event referencing an earlier **same-key** version or code default 0; it never deletes events, decrements versions, changes policy version or rolls back unrelated interventions. There is no high-risk intervention key in this candidate. Future policy changes must not reuse this rollback path. History is exact-key, newest-first, 50 events per cursor page; the editor can load older events. No history truncation/retention defaults are silently approved.

## Defaults, outage and consistency

- Candidate gate off: code defaults preserve Batch 10A behavior; no candidate setting table read. The announcement authorization gate is still mandatory.
- Gate valid and row absent: validated code default, version 0, source DEFAULT, no invented actor/timestamp/event.
- Valid row: DATABASE value/version/actor/time from exact-key lookup. A repeatable-read transaction snapshots the independent two-key display configuration.
- Configured storage missing, failing, invalid policy/value/version or unverified environment: consumer returns UNAVAILABLE and hides the notice section; bounded operational logging retains a diagnostic error ID. No stale/default value silently enables display on storage outage. API mutations/read editor fail; read-only operational inventory remains available when the base auth/DB is healthy.
- Independent requests see committed data with no cache invalidation dependency. In-flight requests and loaded documents are snapshots, not atomic global live updates. No coupled security rules are migrated to this architecture.

## UI and running the owned candidate

`components/admin/platform-settings.tsx` preserves 31 read-only rows, adds safe search/grouping, source/type/risk explanations and two scoped editors. Unsaved values are explicitly identified and associated with their loaded version. Conflict responses require reload; browser drafts do not adopt a newer version silently. Actual persisted version, actor and Taiwan time are shown with history and a confirmed rollback action. The complete settings-writer API is unavailable outside the owned gate; disabled buttons are not relied on for security.

Generate the client with `node node_modules/prisma/build/index.js generate` (generation does not migrate a DB). Use `npm run test:platform-settings`, `npm run test:platform-settings-migration`, `npm run test:platform-settings-production` through the existing `tests/run-isolated.ts`, choosing an explicitly absent local owned MRT_TEST_DATABASE_URL. The harness creates/marks/migrates the DB, configures independent origin/allowlists, starts the app and runs real browser/API fixtures, then removes only its verified owned DB, synthetic principals and recorded uploads. It refuses existing databases. No production or retained demo DB is a valid test target. Candidate data/history retention ends with whole-owned-DB disposal; production retention and least-privilege rollout are separate decisions.
