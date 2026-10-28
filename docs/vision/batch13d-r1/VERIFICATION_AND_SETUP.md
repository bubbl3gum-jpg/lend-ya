# Verification, setup and limits

Use only the existing guarded isolated runner. Set MRT_TEST_DATABASE_URL to a new unique local hustlen_test_* target distinct from DATABASE_URL. `npm run test:item-studio` creates and marks the new database, applies existing plus this additive migration, starts development with HUSTLEN_ITEM_STUDIO=`owned-studio-only` and exact localhost HUSTLEN_ITEM_STUDIO_ORIGIN, creates synthetic ordinary users/listings, exercises real persistence/browser flows and removes only its owned DB. `test:item-studio-production` uses actual next build/start with the flag configured and refuses all page/API/photo surfaces. No existing database reset, migration or seed.

The studio is `/dev/item-studio`;13D documentation and13B inspection expose the integration only when the independent studio flag is enabled. Both paths use a single listing-owned draft. A session-authenticated owner may resume it after reload/new login, while the owned test DB exists; test completion deliberately cleans the disposable DB. Persistence is real PostgreSQL, not localStorage or in-memory state.

## Initial defects retained

- Initial type check found JSON JsonValue/InputJsonValue boundary errors on version snapshot creation; explicit server-side JSON conversion corrected them.
- Initial save503: advisory lock was queried as a returned PostgreSQL void column; existing executeRaw lock convention corrected it. Second save503: a shared deferred trigger used boolean AND with table-specific NEW fields, so PostgreSQL planned an inapplicable record field. Nested table-specific branches corrected the new migration before commit. Neither change weakened the required event or owner check. Each failed owned fixture cleaned.
- The next run passed persistence, concurrency, immutable-photo/version and audit-failure rollback checks, then the browser's exact textarea label assertion failed because existing text contributed to implicit label text. Explicit accessible aria-labels fixed it; meaningful test deadlines unchanged.
- Separate final tests add populated-table TRUNCATE denial, valid-context missing-event rollback, actual inline inspection integration, browser photo persistence and unknown/foreign/media/CSRF cases. No assertion weakening or collector suppression. Normal login timing intermittence remains tracked; a passing serial run is not proof it is resolved.

## Scope of evidence

Focused actual API/browser tests register real sessions, save incomplete manual-first drafts, retrieve them, persist real decoded synthetic photos, exercise photo-first creation, confirm immutable versions, update drafts without altering old versions, reject concurrent stale writes/foreign refs/unrelated accounts, protect stored bytes, force event failure and prove rollback, deny direct immutable SQL changes, and test logout/expiry. DB timestamps and actor attribution are persisted, not fabricated success.

The owner browser performs native login, real save/reload, actual upload through native file selection and confirmation, history display, bilingual desktop/tablet/mobile screenshots and an actual13B inspection-panel read. No external origins or unexpected browser errors in positive flows. Intentionally rejected API cases are outside the positive browser context; its original collector remains strict.

The agreement adapter is tested with actual booking participant authorization: owner current confirmed versions are explicitly not agreed rental documentation, borrower receives no unagreed private versions, old bookings remain UNKNOWN and no snapshot writer exists. This is the user-authorized blocked-dependency fallback, not implemented rental snapshot persistence. No claim that a new rental binds a version, or that listing photos replace fresh pickup evidence.

New migration replay and compatibility are exercised by fresh builds/integration and the existing populated historical migration suite. It verifies prior rows/foreign keys/evidence/checksums and schema diff. Original migration files remain unchanged; new schema objects empty by default. Current tests do not constitute production backup/restore certification or a production rollback run. Code rollback leaves additive unused tables/data intact; never down-migrate/delete history as an operational shortcut.

## Design/accessibility and remaining acceptance

English/Traditional Chinese new operational strings, shared heritage materials/local typography/appearance, ruled draft/photo/history groups, keyboard labels/focus and responsive image sizing. Existing inspection body remains its prior English scope, with the new saved-documentation section localized. IDs/source user text/action codes are not translated. No new runtime artwork/fonts, AI animation, particles or audio.

Screenshots and viewport/keyboard checks are engineering evidence, not full WCAG/screen-reader/physical-phone-camera or product-owner visual acceptance. No live AI/eKYC or real image-condition model was evaluated. Quality is deterministic assistance only. Production consent/retention/ownership-transfer/account-deletion/publication compatibility and bilateral agreement extension remain unapproved. All unresolved Stage 6–9 and13B-R1 claim/response/notification dependencies remain.

Final queue regression: selecting multiple files and then saving text or one photo must not discard the other pending file. Pending files keep the unsaved indicator and block confirmation; only a successfully uploaded area resets its native file input. Browser verification covers text-save with two selections, then both actual persisted uploads before confirmation.
