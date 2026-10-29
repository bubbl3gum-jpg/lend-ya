# Selected verification ledger

29 October2026, Asia/Taipei. Implementation `a6c8705e78fa0948210e23a9b6f940f711f55e9c`. Exact UTC start/end times, artifacts and actual exits are in [final-results.json](final-results.json). This is the selected relevant set, not every repository script.

**Final: 31/31 selected command groups passed. Unit tests146/146.** All changing groups used new guarded owned disposable PostgreSQL databases. Positive browser collectors and existing deadlines/assertions remain strict and unchanged. Browser groups ran serially; four static commands ran concurrently only with browser groups stopped.

| Command | Exit | Actual result | Artifact/log |
|---|---|---|---|
| `npm run build:verify` | 0 | Passed | `.test-artifacts/bd9e94341e39c476adc19967` |
| `npm run lint` | 0 | Passed | `/tmp/hustlen-13br1/lint.log` |
| `npx prisma validate --config prisma7.config.ts` | 0 | Passed | `/tmp/hustlen-13br1/prisma-validation.log` |
| `npm run test:account-security-ux` | 0 | ℹ pass 1 | `.test-artifacts/b56f378ac2613042527fb3fd` |
| `npm run test:admin` | 0 | ℹ pass 7 | `.test-artifacts/177ff1faa65d45e33e2b5b95` |
| `npm run test:announcements` | 0 | ℹ pass 9 | `.test-artifacts/efed5fe27204aaf6f2dc645d` |
| `npm run test:authorization` | 0 | ℹ pass 8 | `.test-artifacts/66d965544d8cb4254a164cc2` |
| `npm run test:chat` | 0 | ℹ pass 14 | `.test-artifacts/2afde5a7a403b06fc108ac41` |
| `npm run test:condition-claims` | 0 | ℹ pass 1 | `.test-artifacts/d17504e686858dbdb90af929` |
| `npm run test:condition-claims-migration` | 0 | ℹ pass 1 | `.test-artifacts/a7817681cd63b6c63def86a8` |
| `npm run test:condition-claims-production` | 0 | ℹ pass 1 | `.test-artifacts/6025f5c233de9745e889dafd` |
| `npm run test:database-principals` | 0 | ℹ pass 7 | `.test-artifacts/2b132b8b6132d82628ade1cd` |
| `npm run test:identity` | 0 | ℹ pass 1 | `.test-artifacts/1d73bfd04b44d1b0c8771e87` |
| `npm run test:integration` | 0 | Passed | `.test-artifacts/b3968bb5766a1266031e2720` |
| `npm run test:item-documentation` | 0 | ℹ pass 1 | `.test-artifacts/b11e32c13caf88d75a45ca0d` |
| `npm run test:item-studio` | 0 | ℹ pass 1 | `.test-artifacts/c26b5709d4bbac3fdbb6a001` |
| `npm run test:locations` | 0 | ℹ pass 7 | `.test-artifacts/4798b560bf23aaa38f053ec1` |
| `npm run test:login-readiness` | 0 | ℹ pass 1 | `.test-artifacts/99dcc55107b1af2fe4769585` |
| `npm run test:meetup` | 0 | ℹ pass 12 | `.test-artifacts/0dbcc41167db1e33d7673297` |
| `npm run test:meetup-session` | 0 | ℹ pass 6 | `.test-artifacts/3ea1b44b276f77a6b92c9c6b` |
| `npm run test:mfa` | 0 | ℹ pass 16 | `.test-artifacts/9456a9bd51342a320e36c930` |
| `npm run test:migration` | 0 | Passed | `.test-artifacts/67d28d9f5ee1ba33e91cce10` |
| `npm run test:moderation` | 0 | ℹ pass 10 | `.test-artifacts/16afeb9a9099165d7af234bc` |
| `npm run test:platform-settings` | 0 | ℹ pass 8 | `.test-artifacts/ad152aac4eac15a139270df2` |
| `npm run test:rental-api` | 0 | ℹ pass 13 | `.test-artifacts/8883858fcfd6ca47261b0913` |
| `npm run test:rental-browser` | 0 | ℹ pass 4 | `.test-artifacts/1a505db5bd7c7f2cd31ffe1c` |
| `npm run test:rental-documentation` | 0 | ℹ pass 1 | `.test-artifacts/b4e031adb4e487f8fa5e2738` |
| `npm run test:support-channels` | 0 | ℹ pass 9 | `.test-artifacts/e2c303224807b7b771dc4b29` |
| `npm run test:support-staff` | 0 | ℹ pass 15 | `.test-artifacts/90ed8fec1e360bfde5656f26` |
| `npx tsc --noEmit` | 0 | Passed | `/tmp/hustlen-13br1/typecheck.log` |
| `npm run test:unit` | 0 | 146 passed | `/tmp/hustlen-13br1/unit.log` |

## Scope and final reruns

The final new-case browser/API/race suite, production refusal, populated additive migration, original historical migration and normal production build ran against the committed implementation. Earlier selected suites exercised the preserved original contracts; the final static checks cover the frozen source. Evidence commits contain no application changes.

`test:condition-claims` is one composite test with real HTTP/SQL/native browser assertions, not an inflated scenario count. It exercises actual browser owner submission and actual borrower response/reload, real R1/R2 agreed-context preparation, private refs,24h boundary/reload, concurrent claim/supplement/clarification retries, immutable history, event-failure rollback, account suspension/expiry/logout and a queued writer blocked by real session revocation. Trusted synthetic notice is deliberately aged through controlled owned-fixture setup to demonstrate a past48h timestamp; real borrower response remains allowed and no liability/closure occurs. This is not a real delivered notification or real-world receipt certification.

Production refusal uses actual build/start with flags configured, real registration/current persisted cookie, then verifies the typed original dispute submission is refused and no structured case exists. Page/API refusals are also checked. No mock authorization success.

Full `test:meetup`:12/12, including genuine virtual-camera pickup and return decoding, independent consent/GPS/freshness, recovery, expiry, physical return/inspection and restart. Manual-code recovery is separate, not camera substitution. Original MRT integration reports empty browserErrors; meetup-session6/6; login-readiness1/1. Existing Support-staff15/15 includes13A restricted companion; original meetup includes13B; identity1/1 covers13C simulation; studio/documentation/R2 agreement regressions passed.

Populated additive migration preserves historical users/bookings/sessions/reviewer/audit/evidence/legacy Dispute and Return, verifies partial SQL failure rollback and deploy/replay, and preserves prior migration checksums. Original historical suite:32 total applied migrations, all14 history/security table snapshots preserved, private evidence/cancellation/legacy station identities/FKs/audits intact and combined Prisma schema diff empty. No existing application database operation.

Normal build uses the inherited production-safe font strategy, with no test font substitution. No live-model/provider requests, model measurements or approvals are invented.

## Initial failures and corrected defects

- New migration initially had an unparenthesized CASE expression in a PL/pgSQL condition. A raw guarded rollback test surfaced42601 instead of its expected deliberate42883 failure. Parenthesized only the new expression; all31 historical migration files untouched.
- Initial browser locator matched both original allegation and its preserved history copy. The test now requires exactly two copies and targets the original visible one. No missing-content assertion is suppressed.
- A nested select label included its options, causing a30-second locator timeout. Added explicit localized accessible select names; existing timeouts unchanged.
- Queued revocation test initially saw409 with no saved event because serializable snapshot abortion preceded session classification. Service now performs only a fresh read-only session check after rollback and returns401 for revoked session. It never retries or authorizes a write. Same strict test passes.
- Visual review localized fixed status/evidence labels and removed preview-only wording/examples from the durable inspection mode; feature-off preview remains unchanged.

[Initial outcomes](initial-outcomes.json) retain failed-run IDs/exits/cleanup separately. No overlapping-login failure or disk exhaustion occurred in the final selected serial run; the historical general overlapping-workload login issue remains open, not resolved by these passes. Disk observations retained ample free space (about15GiB near closeout).

## Preservation / cleanup / limits

[Preservation manifest](preservation.json):31 historical migrations and256 protected files unchanged, including all original test assertions/collectors apart from the runner’s additive selectors. Original untyped dispute handler is unchanged after removing the two explicit delegation lines; original inspection reader is semantically identical after removing its optional transaction adapter. Fourteen roadmap stage names/order/objectives and unfinished earlier-stage production gates preserved.

[Read-only cleanup verification](cleanup.json) confirms zero residual13B-R1 owned databases and zero owned test principals. Harness removed recorded fixture uploads. No reset, migration, seed or modification of an existing application DB; no push/merge/deploy.

Production delivery/48h qualification, failed-delivery/reminder/exception/appeal/amendment policy, retention/principals, new evidence uploads and structured Support access remain blocked. Screenshots and keyboard/viewport checks are engineering evidence, not full accessibility, physical-device or product-owner visual acceptance.
