# Final selected verification

Implementation `ffb40f788d5d2fe0ec91166c809593061803f582`. **22/22 final selected isolated command groups passed**, plus **115/115 unit tests**, TypeScript, ESLint, Prisma validation, production build and the offline preparation command (exit 0). Initial sentinel failure is separate. Child exits and ended owned cleanup markers were inspected, not just coordinator status.

| Command (`npm run …`) | Final result | Node tests when emitted |
| --- | --- | --- |
| `test:ai-case-brief` | PASS / exit 0 | 1 |
| `test:ai-case-brief-production` | PASS / exit 0 | 1 |
| `test:ai-case-brief-disabled` | PASS / exit 0 | 1 |
| `test:admin` | PASS / exit 0 | 7 |
| `test:workbench` | PASS / exit 0 | 7 |
| `test:support-channels` | PASS / exit 0 | 9 |
| `test:support-staff` | PASS / exit 0 | 14 |
| `test:authorization` | PASS / exit 0 | 8 |
| `test:staff-session` | PASS / exit 0 | 13 |
| `test:mfa` | PASS / exit 0 | 16 |
| `test:account-security-ux` | PASS / exit 0 | 1 |
| `test:localization` | PASS / exit 0 | 1 |
| `test:homepage` | PASS / exit 0 | 1 |
| `test:chat` | PASS / exit 0 | 14 |
| `test:moderation` | PASS / exit 0 | 10 |
| `test:integration` | PASS / exit 0 | not emitted |
| `test:meetup-session` | PASS / exit 0 | 6 |
| `test:meetup` | PASS / exit 0 | 11 |
| `test:rental-api` | PASS / exit 0 | 13 |
| `test:login-readiness` | PASS / exit 0 | 1 |
| `test:password-change` | PASS / exit 0 | 1 |
| `build:verify` | PASS / exit 0 | not emitted |

Unit tests preserve the 16 deterministic 12B contract/error scenarios and add corpus/approval/no-egress/budget/hint checks. The separate **16 proposed quality tasks are not model-quality passes**: all human scores are null, no live model ran. Dry-run boundary tests do not establish real tokenization, tariff or billing enforcement. Approvals and reliable hard-cost enforcement are incomplete, so no billable request was attempted.

Actual browser: ten pending decisions, keyboard/touch disclosures in English and Chinese, source/human-review/cancel/dirty-draft/expiry semantics and no-case-state mutation preserved. Only exact intentional negative-response windows are acknowledged locally; strict shared errors and original deadlines remain. Positive browser context sees no external HTTP calls, only the existing same-origin simulated API. Offline fetch sentinel/import guards and absent live adapter supplement, not replace, future infrastructure egress controls.

Actual isolated production build/start has development flag plus inert fake key/endpoint/approval strings present. Page/API remain 404 and navigation absent; no real credential was read or activated. Disabled-development refusal passes. Existing server route/validator/adapter/auth/proxy files are byte-identical; no new route, staff grant, private-data reader or executor.

Original MRT integration and meetup-session **6/6** pass; full virtual-camera meetup **11/11** retains pickup/return actual QR frame decoding, verify 200 and track cleanup (camera JSONs). Relevant Admin, Support, authorization, MFA/session, account/password, rental, chat/moderation and localization/homepage suites pass. Readiness ran with original assertions alongside other selected work; its pass does not resolve historical R1 intermittence. No camera/GPS/consent/evidence/custody check changed.

Changing tests used distinct new ownership/effective-target-verified DBs, with UTC timing/run IDs in JSON. Final read-only maintenance reports **zero owned 12C DBs and zero marked test principals**. All historical migrations/schema/lockfile/legacy guards and 12B core source remain unchanged (82-file preservation check). Existing migrations replayed only in fresh owned targets; no migration or existing application DB change.

No real-model inference, customer-data processing, new dependencies, provider SDK, push, merge or deployment. Stage 6–9 blockers and Stage 10 production/model approvals remain. Selected tests are not every repository suite, real-device/Safari/screen-reader/native-zoom acceptance, full contrast/low-end-device or independent security/visual certification. Completed owned generated Next caches only were pruned; diagnostics/screenshots retained. Final runtime was build checked; later screenshot assertions were type/lint checked.
