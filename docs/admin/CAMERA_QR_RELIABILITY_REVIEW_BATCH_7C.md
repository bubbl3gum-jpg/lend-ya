# Camera & QR verification reliability — Batch 7C review

Baseline: clean **feature/operations-investigation-context-batch-7b**, exact final commit **e58f09412321672be2ab7c42c57c277bcac487e3**, parent **fe83e274ba93183d6b083bd13184015c21a3dc52** (successful Batch 7A). Isolated branch: **fix/camera-qr-verification-reliability-batch-7c**. The main closeout supplies this batch's exact commit SHA; this supporting review is committed with the implementation. Artifacts retain actual execution timestamps.

## Outcome and scope

The diagnosed decoder sensitivity is addressed with bounded real-pixel processing, and an independently demonstrated camera-stop race is fixed. Three new owned-database **full** meetup runs passed **11/11 each**, including actual browser camera decoding for **both pickup and return on the same booking**, real server verification, explicit participant receipt/checklists, the Batch 7B post-return investigation assertion and final accepted inspection. The two later runs were concurrent. These are virtual Chromium camera fixtures, not physical-device certification or a guarantee for every browser/QR/environment.

Manual-code protocol and browser response-loss recovery remain separately labelled. They do not replace either camera stage. The existing 20-second pickup camera deadline is unchanged; the return camera deadline is also 20 seconds. GPS, signatures, consumption/replay, consent, evidence and custody rules are unchanged. No unrelated Admin feature work was undertaken.

## Original evidence and baseline comparison

Batch 7B's two full runs each reported 7/9: its existing pickup camera assertion at `getByText(/Verified booking/)` expired after 20000ms. Its video metadata showed readyState 4, playing, 640×480. These properties establish an available video, **not decoding**. Both failures occurred before the additional post-return Admin context assertion. Manual-code protocol success was correctly separate.

The scanner application, QR construction/camera setup before the failing pickup assertion, lockfile and installed decoder were compared against successful Batch 7A. Relevant scanner/dependency bytes are identical across those baselines; Batch 7B is not assumed to have introduced the defect. The library is `@zxing/browser` 0.1.5 using `@zxing/library` 0.21.3; neither is upgraded or patched in node_modules by this batch.

[Retained-frame reproduction](../security/batch7c/original-decoder-reproduction.json) shows both retained failing PNGs and first Y4M frames reproducibly fail ordinary QR location in that decoder at the original geometry. They contain valid encoded data: analysis-only alternate geometry/pure-image diagnosis can decode them, and ordinary detector decoding succeeds after scale/orientation changes without changing the QR payload. Pure-image assumptions are **not** enabled in the application. No private pixels, QR text or real challenge secrets are committed.

A deterministic **public** 128-fixture corpus reproduces the same detector sensitivity in an actual browser canvas at the camera fixture geometry. Original/native detection succeeds for 113 and misses 15; the bounded corrected path decodes all 128 exactly: 12 via half-scale, 3 via rotated half-scale. The production-minified test bundle exercises the same reader implementation, not a synthetic success callback. Fixtures are generated from public fixed seeds; their strings are unsigned test data, never application authority. Reproduce with `npm run test:camera-reader`.

This confirms a QR **location/detection geometry sensitivity**, before challenge parsing or server verification. It does not identify a specific internal FinderPatternFinder line or certify that no other cause can ever occur. A fresh original-scanner isolated pickup happened to succeed, consistent with pattern-dependent behavior; its initial isolated runner subsequently failed from a test-variable scope error, not from camera verification. That initial result is not counted as a passing full run. Retained-video and public-corpus reproduction provide the deterministic failure evidence rather than blind attempts to obtain a particular random QR.

## Pipeline trace

| Stage | Evidence and conclusion |
| --- | --- |
| Permission/device | Real getUserMedia against Chromium's file-backed camera; track state/settings metadata only. Permission-denial negative retained. No physical device identity/label is invented or logged. |
| Initialization/playback | Video ready state, dimensions, media acquisition timing and live/ended state observed. The test video is generated synchronously after the actual issued QR and a new camera browser attaches to it; no placeholder acceptance. |
| Frame construction/visibility | PNG → 480×480 QR → white-padded 640×480 YUV420P, 10fps, 2s fixture. Metadata/decoder checks establish readable source pixels; complete frames/videos remain ignored local artifacts. |
| Processing | Test observer counts actual video draw calls, frame attempts and normal/half/rotated detections. readyState alone is never counted as decoding. |
| Detection/decoding | Reproducible native misses on valid patterns; corrected reader still uses the same QR decoder on actual transformed pixels, bounded to three attempts per frame. No PURE_BARCODE shortcut, signature substitution or decoded-text fabrication. |
| Parsing | Existing five-part HUSTLEN1/booking/purpose checks preserved, with fixed diagnostic categories. Invalid QR is rejected before a verification request. |
| Request/server | Observer records only normalized operation, response status and duration, with no URL IDs/query/body/token. Actual verify 200 and exactly one CHALLENGE_VERIFIED event are asserted for each camera challenge. Full security negatives still cover expired/consumed/wrong actor/stage and immutable hashes. |
| UI/custody | “Verified booking” follows successful server verification. Camera verification alone leaves HANDOFF_PENDING / RETURN_PENDING unchanged. Only actual participant confirmation/checklists/physical receipt move custody, and return receipt reaches INSPECTION without acceptance. Batch 7B assertion is reached and confirms QR-recorded return with inspection still unestablished. |

## Minimal corrective implementation

`lib/qr-camera-reader.ts:CameraQrReader` keeps normal decoding first. On recognized QR miss/format/checksum exceptions only, it makes at most two further detector attempts using the same captured pixels: half-scale, then an orthogonal rotated half-scale (small frames avoid unusable downsampling). The temporary canvas is reused. Unexpected processing errors propagate; unrecognizable frames remain misses. It changes neither payload bytes nor verification policy. The existing continuous scan loop remains; no network retry or assertion-deadline increase is added.

`components/meetup-verification.tsx` dynamically loads this reader. It owns a pending MediaStream as soon as getUserMedia resolves, checks generation before attachment, and releases tracks on stop/unmount/failure. Late decoder controls are installed only for the current generation. Track interruption produces an honest restart/manual-option error; unexpected canvas/decoder failure cannot silently leave an active scanner. Existing scanBusy/generation protections and server verification remain in place.

The ownership change addresses a **separately confirmed race**: a negative test stopped scanning after the track became live but before decode controls resolved, and the track remained live. Retained metadata shows that failed cleanup window. The stream reference fixes immediate release instead of waiting for late initialization. This is not claimed as the cause of Batch 7B's two detection failures.

`lib/camera-diagnostics.ts` emits only fixed stage/category metadata under an explicit development test flag, and never in production even if that flag is accidentally set. ZXing's stable getKind is used for error classification so production-minified constructor names do not turn normal misses into fatal errors. Unit tests cover production refusal and arbitrary-string suppression. No telemetry grants permission or changes a verification result.

## Safe diagnostics and evidence handling

`tests/support/camera-diagnostics.ts` records bounded stage/error counters, real track readiness/settings (width/height/fps only), video draw counts, console/page-error categories without messages, normalized request statuses/durations, safe DOM outcome flags, UTC timestamps and independent correlation UUIDs. Browser labels/device IDs, QR contents, credentials, request bodies, coordinates, private messages, evidence bytes and full frames are excluded. An explicit allowlist rejects unknown diagnostic values. Host load/Node CPU and aggregate Chromium process-list snapshots are contextual observations, not proof that contention caused the original failures; retained host snapshots can include defunct process entries.

Committed evidence is selected JSON only. Ignored local full-suite artifacts can contain synthetic QR/video/screenshots for debugging and are **not** copied into Git. The public corpus contains no real issued secret. Existing log non-disclosure checks remain. The test-only transpiler name helper is an identity function needed when serializing TypeScript evaluation callbacks; it does not mock decoder/server success.

## Verification conditions and results

| Full run | Conditions | UTC start → end | Result | Safe evidence |
| --- | --- | --- | --- | --- |
| 1 | Standalone | 2026-10-24T17:02:24.266Z → 2026-10-24T17:06:31.389Z | 11/11; cleanup confirmed | [Run 1](../security/batch7c/full-run-1/camera-pickup.json), [return](../security/batch7c/full-run-1/camera-return.json) |
| 2 | Concurrent with other full run | 2026-10-24T17:06:31.435Z → 2026-10-24T17:11:11.371Z | 11/11; cleanup confirmed | [Run 2](../security/batch7c/full-run-2/camera-pickup.json), [return](../security/batch7c/full-run-2/camera-return.json) |
| 3 | Concurrent with other full run | 2026-10-24T17:06:31.438Z → 2026-10-24T17:11:11.281Z | 11/11; cleanup confirmed | [Run 3](../security/batch7c/full-run-3/camera-pickup.json), [return](../security/batch7c/full-run-3/camera-return.json) |

Run 1 was the standalone camera acceptance comparison (routine unit work completed before its camera stage). Runs 2 and 3 were started concurrently, with separate databases/run markers, ports, videos, browser processes and artifacts. Routine security/migration/build work also ran during their earlier phases. Conditions and host metadata are retained; this is a bounded concurrent-load check, not a production capacity benchmark.

The full suite now has 11 reported tests because the browser manual-code response-loss scenario is separate and explicit camera lifecycle negatives were added. Original API/security/timing scenarios are retained. Both real camera stages are part of the default full run; `test:meetup-camera` is only an explicit owned isolated comparison mode, not a replacement for `test:meetup`.

Coverage includes actual invalid QR content, camera permission denial, real stream interruption, decoder/canvas initialization failure, camera restart/stop/navigation cleanup, no verification request on invalid/blank input, one verification event despite repeated visual frames, and no camera-only custody transition. Existing actual server tests cover invalid/expired/consumed challenges, wrong participant/booking/stage, rotation, replay/concurrency, GPS accuracy/freshness/fallback consent and immutable evidence. The manual-code API test remains separately labelled.

Initial failures/iterations are retained separately from final passes: an isolated-mode pickup-variable scope error after a successful native pickup; an initial public-corpus browser-evaluation `__name` harness error; the confirmed stop-during-initialization stream leak; and transient TypeScript overload/environment-property typing errors in the new test instrumentation. An intermediate half-scale/positive-rotation corpus prototype still missed 3/128; it was rejected in favor of the tested 270° transform. Those failures were corrected at their responsible layers. None is merged into a misleading passing aggregate, and no original 20-second camera deadline is extended.

| Command | Actual result |
| --- | --- |
| `npm run test:admin-migration` | Exit 0; ℹ pass 1; cleanup confirmed |
| `npm run test:admin-own-session` | Exit 0; ℹ pass 6; cleanup confirmed |
| `npm run test:admin` | Exit 0; ℹ pass 7; cleanup confirmed |
| `npm run test:approval-migration` | Exit 0; ℹ pass 4; cleanup confirmed |
| `npm run test:approval` | Exit 0; ℹ pass 18; cleanup confirmed |
| `npm run test:authorization` | Exit 0; ℹ pass 8; cleanup confirmed |
| `npm run test:chat` | Exit 0; ℹ pass 14; cleanup confirmed |
| `npm run test:database-principals` | Exit 0; ℹ pass 7; cleanup confirmed |
| `npm run test:execution-rehearsal` | Exit 0; ℹ pass 18; cleanup confirmed |
| `npm run test:investigation-receipt` | Exit 0; ℹ pass 2; cleanup confirmed |
| `npm run test:login-navigation` | Exit 0; ℹ pass 7; cleanup confirmed |
| `npm run test:login-readiness` | Exit 0; ℹ pass 1; cleanup confirmed |
| `npm run test:meetup-camera` | Exit 0; ℹ pass 4; cleanup confirmed |
| `npm run test:meetup-migration` | Exit 0; ℹ pass 1; cleanup confirmed |
| `npm run test:meetup` | Exit 0; ℹ pass 11; cleanup confirmed |
| `npm run test:mfa-migration` | Exit 0; ℹ pass 4; cleanup confirmed |
| `npm run test:mfa-pilot-disabled` | Exit 0; ℹ pass 1; cleanup confirmed |
| `npm run test:mfa-pilot-production` | Exit 0; ℹ pass 1; cleanup confirmed |
| `npm run test:mfa-pilot` | Exit 0; ℹ pass 13; cleanup confirmed |
| `npm run test:mfa` | Exit 0; ℹ pass 16; cleanup confirmed |
| `npm run test:migration` | Exit 0; command completed; cleanup confirmed |
| `npm run test:moderation` | Exit 0; ℹ pass 10; cleanup confirmed |
| `npm run test:rental-api` | Exit 0; ℹ pass 13; cleanup confirmed |
| `npm run test:rental-browser` | Exit 0; ℹ pass 4; cleanup confirmed |
| `npm run test:scoped-reads` | Exit 0; ℹ pass 10; cleanup confirmed |
| `npm run test:stability` | Exit 0; ℹ pass 8; cleanup confirmed |
| `npm run test:staff-migration` | Exit 0; ℹ pass 4; cleanup confirmed |
| `npm run test:staff-read-pilot` | Exit 0; ℹ pass 14; cleanup confirmed |
| `npm run test:staff-schema` | Exit 0; ℹ pass 8; cleanup confirmed |
| `npm run test:staff-session-migration` | Exit 0; ℹ pass 4; cleanup confirmed |
| `npm run test:staff-session` | Exit 0; ℹ pass 13; cleanup confirmed |
| `npm run test:workbench` | Exit 0; ℹ pass 7; cleanup confirmed |
| `npm run build:verify` | Exit 0; command completed; cleanup confirmed |
| `npm run test:unit` | Exit 0; 66/66 |
| `npm run test:camera-reader` | Exit 0; 1/1 |
| `npx tsc --noEmit` | Exit 0 |
| `npm run lint` | Exit 0 |
| `npx prisma validate` | Exit 0 |

[verification.json](../security/batch7c/verification.json) retains exact child exits/times/artifacts, all three fresh full runs and initial outcomes. Parent tests are included in Node counts. The wrapper's own exit is not substituted for child results. No physical camera/phone was available: remaining coverage is real iOS Safari/Android camera selection, focus/glare/skew/distance, permission recovery, low-end CPU/battery, secure-origin behavior and device/navigation lifecycle differences. Public-corpus and virtual-camera success do not certify all of these.

## Preservation and next batch

[Baseline hashes](../security/batch7c/baseline-preservation.json) preserve all application routes/APIs, Admin/Workbench/context/MFA/staff/approval code, participant action/evidence components except the explicitly changed scanner, all 23 historical SQL migrations, Prisma schema, lockfile, official MRT catalogue and server custody/location logic. No new dependency version or migration is introduced. Fresh/populated migration and protected-authority suites remain in the regression ledger. All changing tests use new verified owned `hustlen_test_b7c_*` databases, never an existing application DB; [cleanup](../security/batch7c/cleanup.json) is a read-only maintenance catalog check after tests.

Next Admin implementation can resume **after independent review of this correction**, with the previously proposed bounded read-only CaseHistory/audit navigation improvement. Physical-device camera acceptance remains a rollout prerequisite; it is not replaced by this virtual-camera evidence. No staff roles, approval execution, recovery, payment powers, AI administration or unrelated Admin feature is activated here.

Exact inventory: [changed-files.txt](../security/batch7c/changed-files.txt). Stop at the isolated review commit. No merge, push, deployment or real application-database modification occurred.
