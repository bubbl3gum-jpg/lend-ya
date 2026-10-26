# MRT logout/polling regression closure — Batch 10C

Master roadmap: **Stage 8 verification closeout before Stage 9**. Small client-lifecycle and fixture-observation repair; no new authorization framework, API permissions, business functionality, schema/migration or production enablement.

## Exact revisions and scope

- Branch: `fix/mrt-logout-polling-batch-10c`.
- Verified Batch 10B implementation: `94eee81b54ebdf85543e515cd96ef0f5b896696f`.
- Verified Batch 10B evidence closeout: `d40bf00f09e3f4ed452abcd39cebf57143002868`.
- Exact clean documentation HEAD / starting baseline: `4c023549f65cd0788c7c6a4b5a2f65172e670f72`; requested revisions verified as ancestors before branching.
- Tested implementation: `b915e75701b8b858a0fa195c9ac901d248feb57b`.
- Separate evidence closeout: `0a469f964feac64f734a5b6079b1c38ee7570a66`.
- This report is a documentation-only successor so it can contain both exact preceding hashes. Final review HEAD appears in the delivery message. No application code changes follow the implementation commit.
- [Complete changed-file inventory](batch10c/changed-files.txt). Final working tree clean; no push, merge or deployment.

## Actual failure reproduction and root cause

Both retained histories were reviewed: `docs/announcements/ANNOUNCEMENTS_REVIEW_BATCH_10A.md` and `docs/security/batch10b/legacy-mrt-logout-polling.json`. The server correctly denied unauthenticated access. Neither announcement nor settings implementation is shown to have caused this failure.

A fresh owned DB reproduced the baseline failure with the application component unchanged and test-only bounded instrumentation. [Baseline trace](batch10c/baseline-reproduction-trace.json) records timer creation/cleanup, status request start/end, document lifecycle and authentication phase changes, without body/header/cookie/password/token/location/private evidence data. The designated reproduction kept the booking view mounted for an actual post-logout status response; this diagnostic wait was not part of the repaired acceptance flow.

Borrower trace, milliseconds relative to its diagnostic start:

| Event | Observed time |
| --- | --- |
| Last preceding status request completed 200 | 21,241 ms |
| Logout began | 23,913 ms |
| Logout returned 200 | 24,089 ms |
| Next poll-start callback | 24,173 ms |
| That poll returned 401 | 24,223 ms |
| Deliberately incorrect login began | 24,246 ms |
| Subsequent successful login recorded | 25,594 ms |

This was a newly scheduled interval poll after logout in the observed sequence, rather than merely an earlier outstanding poll finishing. The component's 3000ms interval remained active because API logout did not unmount the existing booking page. Its error path displayed an error but retained the loaded verification state and continued scheduling. Existing effect cleanup cleared the interval and camera resources **on unmount**; it did not cancel an already pending status fetch or guard its completion against an obsolete effect generation. Baseline development mount/cleanup tracing also showed two outstanding initial status requests completing in reverse order.

The strict collector itself behaved as coded: `collectBrowserErrors` records page HTTP ≥400, native console errors and unexpected failures. The fixture mixed completed booking UI work with an API-only negative-auth phase while leaving that UI's polling alive. A legitimate unauthenticated background 401 consequently violated its unchanged final `assert.deepEqual(errors, [])`. This is a client lifecycle and test-phase ownership defect, not a reason to make protected endpoints return 200 or globally ignore 401.

## Narrow correction and before/after behavior

Only `components/meetup-verification.tsx` changes application behavior:

- Status loads have an AbortController; replacement and effect cleanup cancel pending status reads. A mounted/effect-generation guard prevents obsolete results from updating data, refreshing another route or reporting receipt proof.
- A current status poll receiving actual 401 stops its timer, invalidates pending status work and camera resources, clears local verification/QR/receipt/retry state, leaves proof-dependent controls locked, and performs full-document navigation to `/login` to discard the authenticated document/router cache.
- A stale or canceled completion cannot redirect/update a different document. Network failures other than intentional cancellation remain observable; non-status requests and server authorization/business logic are unchanged. The 3000ms interval and acceptance timeouts are unchanged.

`tests/mrt-integration.ts` now explicitly navigates borrower views to the login document after all booking UI assertions, before its API-only logout/wrong-password/login checks. This is lifecycle teardown, with no artificial sleep or delayed authentication transition to obtain green results. All original assertions remain, including post-logout denial, wrong credentials, correct login and the empty strict error collector. Dedicated real-browser tests separately keep a protected booking view open while its session is lost.

| Condition | Before | After / verification |
| --- | --- | --- |
| API logout with old booking view open | Interval continues; background 401 becomes a final collector failure | Dedicated negative test proves real session deletion, actual protected 401, stopped poller and login navigation |
| Pending status response during unmount | No request cancellation or generation check | Actual server 200 held in transport; SPA cleanup aborts it; late delivery cannot restore booking state or restart polling |
| Native logout with pending authorized status data | Cleanup did not cancel the pending read | Real Sign out → 200 → new login document; late actual 200 delivery cannot resurrect protected content |
| New valid login | No explicit lifecycle regression coverage here | Wrong native credentials remain 401; successful native login persists a different valid session; old session stays denied; authorized polling resumes |
| Unexpected 401 during ordinary authenticated observation | Collector fails | **Still fails**: real credential-omitting browser request returns 401 while independent current-session access remains 200; strict collector rejects it. Subsequent actual session expiry also clears the protected view. |

The global collector file, logout handler, AuthSession implementation, server status route, participant guards, custody/evidence/GPS/consent/camera validation and all migrations are byte-identical. No general 401 exception, console/network suppression, fabricated success, relaxed timeout or custody override was introduced. Test-scoped negative assertions accept only designated exact real 401 responses and their native diagnostics; any additional path/error fails. Default empty-error assertions remain unchanged.

## Targeted real-browser coverage

`tests/meetup-session.integration.test.ts` uses actual application routes and freshly owned records. It checks real session invalidation and protected denial; invalid native credentials; new session persistence; old-session denial; resumed authorized status reads; SPA timer cleanup and cancellation; native logout with a held real server 200; no protected-title restoration; and default collector rejection of unexpected 401 even while another authenticated request succeeds. Held responses are obtained with `route.fetch()` from the real authorized endpoint, never invented/mutated payloads.

The suite also observes at least one full polling interval after navigation to prove no rescheduling. Those bounded observation waits do not delay authentication transitions or change existing deadlines. All trace metadata is bounded by fixed event names/counters/statuses and 180 events per context; no request/response bodies, headers, credentials, locations or private content are captured.

[Focused lifecycle evidence](batch10c/meetup-session-lifecycle.json) · [Original assertion and source preservation](batch10c/baseline-preservation.json).

## Three fresh original integration acceptance runs

| Execution | Actual command / result | Owned artifact | Browser workload (UTC) |
| --- | --- | --- | --- |
| integration-serial | `npm run test:integration`; exit 0; strict errors empty; cleanup confirmed | `.test-artifacts/a70d6d632767db463f940b81` | 2026-10-26T09:24:06.536Z → 2026-10-26T09:24:31.570Z |
| overlap-a | `npm run test:integration`; exit 0; strict errors empty; cleanup confirmed | `.test-artifacts/a34058e551da3304290a1a65` | 2026-10-26T09:26:39.249Z → 2026-10-26T09:27:17.969Z |
| overlap-b | `npm run test:integration`; exit 0; strict errors empty; cleanup confirmed | `.test-artifacts/667c8a65459929b0f776b821` | 2026-10-26T09:26:39.227Z → 2026-10-26T09:27:17.622Z |


All three execute the original `npm run test:integration` product assertions on separate newly created owned DBs. The two overlap runs use independent browser instances, app ports, artifact/build directories and DB ownership markers. **Measured live-browser workload overlap: 38,373 ms.** Both overlapping executions pass; their strict collectors remain empty. No timeout change or HTTP-error exception was needed under overlap. [Acceptance metadata](batch10c/integration-acceptance.json) and the three redacted per-run traces preserve timing and actual results.

## Final regression ledger

| Selected command | Actual final result |
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
| `npm run test:meetup-session` | Exit 0; ℹ pass 6; owned cleanup confirmed |
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

[Machine-readable full selected ledger](batch10c/verification.json) includes actual exits/counts/artifact paths/cleanup, the three acceptance executions and separately retained initial failures. No full selected-pass claim is based solely on a retry or version change.

The final unchanged full meetup suite passes **11/11**, including genuine virtual-camera QR decoding at **pickup and return**; manual-code recovery remains a separate case. [Pickup](batch10c/camera-pickup.json), [return](batch10c/camera-return.json), [negative camera checks](batch10c/camera-negative-evidence.json) and [post-return checkpoint](batch10c/investigation-qr-receipt.json) preserve safe evidence. The focused session suite passes **6/6 nodes**, including unexpected 401 while independently authenticated access remains 200. No raw QR payload, camera evidence images, credentials or coordinates are committed.

## Initial failures, environment interruption and corrected test tooling

- The first diagnostic serialization emitted `__name is not defined` from transformed init-script helpers. It also observed the baseline 401, but is not used as the clean root-cause proof. Raw fixed test-only JS corrected serialization; the next fresh baseline reproduction failed solely on the expected background status 401/native diagnostic.
- The first focused suite passed four of six test nodes; SPA tracing attempted to register the same diagnostic binding twice, failing that case plus its parent. The fixture now reuses its existing per-context trace. Type checking also exposed installed Playwright package-type differences; the new fixture uses the same root Playwright version as the unchanged helper. No dependency/lockfile upgrade, assertion or deadline change was made.
- A broad full meetup run hit **ENOSPC**: Turbopack could not write ZXing chunks or its build manifest, producing real page 500s and downstream browser failures (7/11 test nodes passed, 4 failed). Its exact results and safe compiler-error classification are retained. This was diagnosed from the server log, not attributed to polling/camera without evidence. Only run-marked failed processes were stopped to unblock teardown; the ownership harness removed its DB.
- Generated `next` build caches from completed, non-preserved owned runs were reclaimed, preserving diagnostics/screenshots/metadata. A temporary tool maintained that same completed-run-only cache policy for the remaining verification to avoid another full disk. No active cache, source, historical evidence or application DB was deleted. After resource recovery, the full meetup suite was rerun unchanged in a fresh owned DB; its actual outcome is in the ledger.
- The preservation tool's initial binary-output buffer was too small for a preexisting screenshot; increasing only that read-only tool buffer allowed the source/hash audit. This is not an application or regression timeout change.

[Initial outcomes](batch10c/initial-outcomes.json) · [Environment interruption/cache cleanup](batch10c/environment-recovery.json). No other final selected command failed. The early instrumentation/fixture failures and ENOSPC-affected 7/11 meetup attempt remain explicitly separate from the final passing results. No recurring chat-login or synthetic-camera decode issue appeared after the diagnosed environment recovery.

## Preservation, cleanup, roadmap and Stage 9A

[Preservation audit](batch10c/baseline-preservation.json) confirms **61 original assertion/check calls** are token-identical, seven existing client camera/evidence/business methods are token-identical, render/proof conditions are preserved, the global error collector is byte-identical, the Prisma schema and all **28 historical migration SQL files** are unchanged, and every server auth/session/status/booking/evidence/staff/approval/configuration/Support source is unchanged. No new migration exists. Test runner/package changes only add the focused owned suite. Existing UI/client poll lifecycle is the sole application change.

[Cleanup confirmation](batch10c/cleanup.json): **0 remaining Batch 10C databases and 0 remaining owned test principals**, verified using a read-only maintenance transaction. Every changing test used newly owned disposable DBs; no existing application/retained demo DB was reset, migrated, seeded or modified. Ignored diagnostics stay local; only safe fixture metadata is committed.

The canonical [14-stage master roadmap](../roadmap/MASTER_ROADMAP_14_STAGES.md) records this Stage 8 verification closeout while retaining **Implemented Candidate**, never Production Ready. Stage 6 still lacks authorized station suspension/restoration and real field/Operations readiness; Stage 7's production-policy and activation gates remain unchanged. Announcements, settings, Support, roles and approval execution receive no production approval.

**Recommended Stage 9A:** a small read-only audit of existing account/profile/name/password flows and their error/loading/mobile/keyboard/contrast behavior, followed by a concrete proposal for an accessible visual slice and light/dark themes. Preserve server guards and session behavior; language fallback needs explicit scope. Do not introduce recovery, mandatory MFA, staff powers, operational settings edits or production rollout as UX polish. Continue [the Stage 9 recommendation](../settings/STAGE_9_RECOMMENDATION_BATCH_10B.md); wait for approval before coding that next slice.
