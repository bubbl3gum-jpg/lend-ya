# Milestone3B — protected evaluation runner

30 October2026, Asia/Taipei. Review candidate; **no genuine model experiment authorized or executed in this batch**. Stop before3C.

## Baseline and scope

Clean starting HEAD `7297e65b91c54d4c6fbf60c05b4e444b8755943e` on M3A, implementation `7f630635714f652d05ccb1f7a2870e6d4500204c`. Branch `feature/protected-ai-evaluation-runner-milestone-3b`. Existing troubleshooting stash preserved. Existing3A corpus, contract versions, historical scores and hashes unchanged. One backward-compatible metadata correction permits a null unobserved model on failed requests; successful-result model checks stay strict.

New `scripts/advisory-evaluate.ts` orchestrates the **existing authenticated application route**, never Ollama directly. `lib/advisory-evaluation/client.ts` extracts the existing fixed evaluator's owned-runtime pre-auth challenge, native synthetic login, local-only origin, per-call Origin/custom header, bounded response reading, request deadline and logout. `scripts/local-ai-evaluate.ts` reuses this helper instead of duplicating authentication. No second inference gateway, new route, scenario registration, model settings, prompt or database migrations.

`lib/advisory-evaluation/runner.ts` loads/validates the full pinned3A dataset against its reproducible generator; chooses exact IDs; maps E10 to existing `SYN-RECOVERY-CHARGER:<language>` fixed selector and all other cases to existing PLAYGROUND requests built only from user-prefix claims. Browser/client cannot assign CONTEXT. Expected and returned manifest digests and existing route's insertion-order input digest must match before accepting output. Advisory output is independently revalidated without editing, repair or filtering.

## Scope, scheduling and failure behavior

- `npm run ai:advisory:evaluate` defaults to an **offline plan** for E03:en, zero network/auth/model calls and no files written.
- Explicit `--cases` IDs (up to3, no duplicates), optional exact `--language en|zh-TW`, hard≤7 planned requests; E01 selects all5 chronological prefixes, shown in plan. No --all, repetitions, arbitrary text or selector substitution. Unknown flags, forged plans/datasets and empty filtered selections fail before authentication.
- Real execution requires `--execute`, explicit --cases and `--confirm-calls` exactly matching planned count, plus development environment and private synthetic login configuration. CLI acknowledgement is an operator safeguard, **not evidence of owner approval**. Do not invoke until owner approves that run/scope. This batch invoked only plan/deterministic/mock-based application checks.
- Native authenticated client first requires the existing protected endpoint's401 challenge; invalid owned runtime or production404 refuses before login. Host/origin must be exact localhost with a valid port. Redirects are errors; no proxy/hosted provider or direct Ollama client is added. Local-host administrative compromise is outside this boundary.
- Sequential sends with11s between completed attempts, unchanged server6-valid-attempts/minute/actor and one-in-flight limit. Prior manual requests may still cause429; stop instead of overriding/resetting limits. Native fixture expiry/session requirements remain authoritative; no refresh or extension.
- No automatic retries. Any failed turn blocks later dependent turns. Validation/timeout can leave a separately selected independent case eligible; authorization, input, rate/environment/transport failure or cancellation stops the remaining plan. Malformed successful envelopes/source bindings stop the whole plan. Summary marks each unrun reason, not a hidden retry or artificial success.
- Server deadline remains60s; existing evaluation-client request ceiling remains65s. Ctrl+C aborts in-flight/wait, rejects late success, and attempts logout of the evaluator-created session with a bounded request. It does not stop the browser, app, PostgreSQL or Ollama. The original demo launcher remains responsible for its own marked DB/roles/process cleanup.

Every outbound evaluation request is counted as an attempt. A server-side auth/limit refusal may never start inference; an interrupted request may have started it without returning. Thus **actual inference executions remain unknown when unobservable**, not automatically equal to HTTP attempts. Summary exposes planned requests, actual submitted requests, reported inference results, failures and not-run turns separately. Probe/login/logout are auth operations, not inference attempts. No success-rate generalization from a small smoke test.

## Results, metadata and review

In-memory run output has versioned3A ResultRecords and blank human reviews; a source-linked `advisory-evaluation-packet-v1` includes each result, exact source manifest, expected invariants/case behavior and unscored six-dimensional review. Failed outputs are not retained as usable advice. Previous human reviews are never copied to new results.

Machine checks: pinned dataset integrity, exact prefix/role/language manifest binding, source-ID membership and allowed CONTEXT kinds. These do **not** grade semantic role awareness, chronology, practical usefulness, visual claims, language or safety. Heuristics remain unscored; no lexical or model-based grader was added. Summary lists failures and all successful turns requiring human review. `compareResults()` validates snapshots and returns matched outcomes, client-latency deltas and output-change booleans; semantic regression remains UNREVIEWED. It does not accept a changed dataset version as comparable automatically.

Measured client round-trip elapsed time is stored as3A latencyMs. Existing gateway-reported latency is separately labelled reportedLatencyMs; these are different intervals. Exact received HTTP status is retained in attempt metadata, including a200 whose invalid body becomes a local failure (3A failure httpStatus is null in that special case because3A permits only error HTTP statuses there).

Reported model tag comes only from a bound successful envelope and must be qwen3.5:9b. Unknown model digest, prompt digest and server schema fingerprint stay null; no provider metadata or hidden thinking is fetched. The3A type already allowed null models, but its validator previously required a model even for a failed request. This would force fabricated metadata when no response arrived. A narrow compatible correction now allows null for failures; success still requires the existing allowed reported model. Both run.model and attempt.reportedModel stay null when unknown, while requestedModel is labelled separately. Independent output/source validation is unchanged. The top-level CLI field is requestedExecutionMode, not proof of execution. Source-kind metadata is explicitly from EXPECTED_MANIFEST and is verified against the response only when responseBound=true.

No raw provider envelopes, hidden reasoning, credentials/cookies, unrestricted errors or real records enter reports. Only allowlisted metadata goes to stdout; failures return static safe errors.

## Artifact storage proposal — approval still required

**Current behavior: no inference transcripts or review packets are persisted.** In-memory records are discarded when the runner exits. No --output, --persist, approval-file, environment-flag or automatic export path is exposed. CLI prints metadata-only summaries; retain those only under the owner's local policies. The legacy fixed-selector evaluator retains its prior explicit output behavior; it was not used for a real run here and is not the new runner's export route.

Proposed for owner approval, not implemented:

- Exact root `<repo>/.test-artifacts/advisory-evaluation/RUN-<random>/`, already under the repository's ignored artifact tree; exclusive0700 directory and0600 files, refusing pre-existing paths/symlinks and refusing alternate roots.
- Files: validated selected synthetic inputs/output records, blank review packet, safe summary and run metadata. Never raw failed-provider content, credentials, cookies, model thinking, account/customer records or ordinary request bodies.
- Retain7days, then explicit owner-triggered cleanup restricted to this exact marked run directory. No silent sweeping, deleting unrelated runs, following symlinks or relying on filesystem deletion as secure erasure. Machine backups/sync remain separate privacy considerations.
- Run marker records schema/run IDs and creation time; cleanup validates these and ownership. No production transcript store or cross-user access. No changes to app DB.

Until owner approves exact retention/export/cleanup and scope, the in-memory packet demonstrates the contract but is not a saved human-review deliverable. This is a deliberate approval blocker, not a claim that transcript export works. Once approved, a small reviewed export addition can expose the already-built packet without rebuilding evaluation or adding model capabilities.

## Mac instructions

This branch is not pushed. After authorized transfer/check-out and `npm ci`, plan safely without any app, DB, credentials or Ollama running:

```sh
npm run ai:advisory:evaluate
npm run ai:advisory:evaluate -- --cases E03:en,E02:zh-TW,E10:en
npm run ai:advisory:evaluate -- --cases E03:en,E03:zh-TW --language zh-TW
```

The proposed minimal genuine smoke is **E03:en + E02:zh-TW + E10:en, exactly3 requests, one repetition**, covering borrower perspective, Taiwan Chinese uncertainty and trusted-context separation. No five-turn expansion or full benchmark implied. A later separately approved E01:en run would be5 requests. Do not run either merely because this document contains a command.

After owner explicitly approves the3-request smoke (and acknowledges memory-only output, or approves a later export change):

1. Start `npm run demo:local-ai` with the same successful private guarded NEW disposable-DB wrapper on the Mac. Keep genuine qwen3.5:9b at numerical loopback11434 and visible browser running. Record the localhost origin shown by Ready. Do not reset an original DB.
2. In a second Terminal, privately configure existing synthetic fixture credentials for this owned demo. Use the current synthetic account email visible in its Account Settings and its established test-fixture password (defined in `tests/support/mfa-fixtures.ts`); do not use a real account, print credentials, copy cookies or put passwords in shell history. The test/launcher does not publish credentials. If the account email/password is unavailable, stop and use supervised fixture setup; do not query a real DB or create real staff.
3. For Mac zsh, private input/export (password is not echoed):

```sh
read -r 'HUSTLEN_LOCAL_AI_REVIEW_ORIGIN?Owned localhost origin from Ready: '
read -r 'HUSTLEN_LOCAL_AI_REVIEW_EMAIL?Synthetic fixture email: '
read -rs 'HUSTLEN_LOCAL_AI_REVIEW_PASSWORD?Synthetic fixture password (hidden): '
export HUSTLEN_LOCAL_AI_REVIEW_ORIGIN HUSTLEN_LOCAL_AI_REVIEW_EMAIL HUSTLEN_LOCAL_AI_REVIEW_PASSWORD
```

4. **Only after that explicit owner run approval**, execute exactly:

```sh
NODE_ENV=development npm run ai:advisory:evaluate -- --execute --cases E03:en,E02:zh-TW,E10:en --confirm-calls 3
unset HUSTLEN_LOCAL_AI_REVIEW_PASSWORD HUSTLEN_LOCAL_AI_REVIEW_EMAIL HUSTLEN_LOCAL_AI_REVIEW_ORIGIN
```

No files/transcripts are written, and the CLI never prints response text or the password. Current output is a safe outcome/latency/source-mapping summary, not a persisted review packet; do not claim completed human review. Use the existing visible Companion for separately authorized manual response inspection, recognizing that manually generating again is a new counted inference. Logout closes only the runner's session; the launcher's browser session is unaffected. Ctrl+C in the demo Terminal performs original owned DB/process cleanup; external PostgreSQL/Ollama survive.

## What remains for3C

After review: approve a bounded baseline scope and artifact policy; if transcript retention is approved, expose the existing in-memory packet via a narrowly reviewed local exporter. Then run the approved small baseline on the Mac, inspect failures and actual outputs, and prioritize measured functional corrections (role perspective, impossible retrospective steps, false image-observation phrasing, actionable neutral guidance). No new evaluation framework, grading provider, translation/Vision integration, production data, autonomous actions or broader benchmark follows automatically. Proposed quality thresholds from3A remain pending approval.

## Verification and changed files

Final checks:

- `npm run test:advisory-runner`:6 focused tests pass (also included in unit suite).
- `npm run test:unit`:169/169 pass. Includes unchanged3A pinned dataset/hash/legacy corpus/review tests and new selection, bindings, sequential E01/E10, partial failure, unknown metadata, comparisons, cancellation/timeout, app-only auth, body caps and offline/production/full-scope refusal tests.
- `npx tsc --noEmit`:pass. `npm run lint`:final pass without warnings. An initial unused-test-import warning was removed; no failing assertion or deadline was relaxed.
- `npm run test:advisory-runner-app`:1/1 pass with fresh owned disposable PostgreSQL, actual native HTTP login/logout and restricted worker/application route, **mocked** loopback inference. Six selected requests (E01 five prefixes +E10), exact mixed-context binding, actual rate refusal, runner-only session deletion and unchanged booking/listing/Support/dispute snapshots. This branch of the integration harness uses HTTP authentication, not a new visible-browser run.
- Existing `npm run test:local-ai-diagnostics`:1/1 pass with mock inference and browser/auth guards; `npm run test:support-staff-production`:1/1 pass, configured development flags still refused in production.
- `npm run build:verify`:pass, normal build through fresh owned guarded DB. Harnesses reported marked DB/upload cleanup. No original DB changes or migration edits.
- Offline proposed3-call smoke plan verified: E03:en,E02:zh-TW,E10:en; planDigest `02f7897ba53a4295eaac0fd560366750fa72a64086552679a5254a0443941bd7`; zero network/model calls and no artifact persistence.
- No unexpected test failures. Groups were rerun after adding assertions and the unknown-failure-model correction; final results above remain distinct from genuine Qwen evidence. No genuine model run/full benchmark or new human reviews. Full unrelated marketplace/camera suites and headed launcher were not rerun or claimed; launcher source and app UI remain unchanged.

Changed files: new `lib/advisory-evaluation/runner.ts`, `lib/advisory-evaluation/client.ts`, `scripts/advisory-evaluate.ts`, `tests/advisory-runner.test.ts`; narrow null-failure-model correction in `lib/advisory-evaluation/contracts.ts`; shared-client reuse in `scripts/local-ai-evaluate.ts`; runner test registration in `package.json`; new branch in `tests/local-ai.integration.test.ts`; supplementary roadmap checkpoint; this report and `verification.json`.

The pinned3A dataset/generator, local gateway/schema/prompt/settings, existing independent Advisory validator, application routes/UI, launcher, historical review scores/corpora, dependency lockfile, migrations and canonical14-stage roadmap are unchanged. Existing stash and sensitive local configurations remain untouched. No generated inference transcript committed. No push, merge or deployment. Stop for owner review before any real smoke or3C.
