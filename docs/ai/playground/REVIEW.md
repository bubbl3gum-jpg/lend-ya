# Interactive local Customer Service playground

30 October 2026, Asia/Taipei. Isolated development candidate, Stage10. No production chatbot, quality approval or executor.

## Baseline and scope

Branch `feature/interactive-local-ai-playground` starts at reviewed R2 closeout `3b4e247a018265657074dc60e5934298a6358183`, containing R2 implementation `fd6c63ab7f69962a491a874a3691f0fa760a93b1` and playable launcher ancestor `baad3b670fcdeaf925c96359cc293b35575ae8e9`. Baseline clean. Earlier unfinished launcher diagnostics remain in the existing stash, untouched. Owner reports real Qwen success on the three R2 selectors; workspace checks do not independently establish that result.

The existing fixed scenario catalogue, pinned corpora, launcher, worker, sessions, production gates, inference transport, schema and independent validator remain authoritative. Only the existing POST `/api/dev/support-companion/local` accepts a second strict input shape. The same companionActor verifies owned disposable DB identity, restricted runtime and current active session before generation and rechecks before release. No new endpoint, secret, grant, migration, private-record query or live hosted model.

## Input and continuity contract

Exact JSON keys: `{mode:"PLAYGROUND", side:"OWNER"|"BORROWER", language:"en"|"zh-TW", messages:string[]}`. One through six chronological user turns; each nonblank, at most1000 UTF-16 code units, without forbidden control characters. Server-generated manifest at most12000 UTF-8 bytes, within unchanged24000-byte gateway request cap. Oversize is rejected, never silently truncated. Existing32768-byte request-reader cap, six valid requests per actor/minute, one inference in flight/process and60s deadline remain unchanged. New conversation does not reset server rate limits.

Server assigns immutable-for-request U1…U6 IDs, PARTICIPANT_CLAIM classification, fixture title and fixed fixture timestamp. It never accepts browser source classifications, role authority, context, IDs or model settings. Fixed timestamps are explicit synthetic labels, not actual delivery, return or agreement events. No CONTEXT exists: source-aware schema requires zero knownFacts, and the independent validator continues rejecting promoted claims and foreign references. Source membership does not prove entailment, privacy, truth or safe advice.

Continuity resends previous **user** turns only. Earlier model replies stay visible in page memory but never become input evidence. The manifest explicitly directs advice toward the latest turn using earlier user turns, asks for clarification on ambiguous references to previous advice and disclaims private-record access. Repeat the specific suggestion in a follow-up when needed. This is a deliberate bounded conversational pilot, not durable or authenticated evidence of conversation history. A malicious client can forge fictional turns; none confers authority or verified fact status.

## UI and retention

The existing Companion now includes an Interactive Playground section alongside unchanged fixed scenarios and offline modes. It inherits existing heritage section/input/button typography and materials, with no new assets, effects or sound. English/Traditional Chinese labels, selected role (locked after first turn), chronological user/AI records, loading elapsed seconds, recorded latency, visible errors, expandable advice/source attribution and keyboard-accessible New conversation.

All conversation content is React memory only: no localStorage, sessionStorage, DB, transcript file or application logging. Reload/unmount removes local state. New conversation clears turns/input and cancels the request; a sequence fence rejects stale results. Error turns remain visible, with previous valid replies separately retained; no silent repair/retry/success. Error codes are allowlisted. Browser cancellation does not prove Ollama immediately stops GPU work or erases runtime memory; existing keep_alive0s and local daemon assumptions still apply.

Fictional-input notice explicitly prohibits real customer information, contact/identity details and sensitive data. This warning cannot technically prove that a tester typed only fiction. Do not use this candidate with real records. No automatic redaction or privacy certification is claimed. The model cannot send messages, process refunds, alter custody, close disputes or obtain staff privileges.

## Mac hands-on test

Once this branch is transferred to the Mac checkout:

```sh
git switch feature/interactive-local-ai-playground
npm ci
```

Run your same successful private Docker-credential startup wrapper, which supplies the trusted original connection reference and a **new** guarded `hustlen_test_*` target on host port55433, and invokes:

```sh
npm run demo:local-ai
```

Do not use an existing application DB as the target or put credentials into reports. Keep genuine local `qwen3.5:9b` running on numerical loopback11434 and Chromium installed. The launcher authenticates the synthetic account and opens the existing real Companion. It stays open for manual testing.

1. Locate Interactive Playground; choose Owner or Borrower.
2. Enter: “Fictional case: the camera was returned, but I have not confirmed whether the charger was included. The other person disagrees. What should I clarify?”
3. Send fictional question. Require actual200 and LOCAL_OLLAMA_INFERENCE, visible advice and latency. Expand source details: U1 is PARTICIPANT_CLAIM; knownFacts must be empty.
4. Follow up: “Could I ask them to check their bag without claiming they are responsible?” Then: “If they disagree, how can I request human review without assuming liability?” Require both genuine results; U1/U2/U3 remain allegations. No automatic model retries. Record any failure honestly, including the existing safe diagnostic category from the network response if enabled.
5. Switch interface language to繁體中文; ask a fictional uncertainty/negation question and inspect source fidelity. Valid structure does not establish translation quality.
6. New conversation clears everything and focuses input. Reload also clears it. Confirm fixed synthetic scenarios still work separately.
7. Ctrl+C stops only owned demo processes and removes its marked database/roles/temp files. Existing PostgreSQL and Ollama remain running. Fixture expiration and original launcher limitations remain unchanged.

No real Qwen generation was executed in this workspace. Hands-on multi-turn quality, source fidelity, negation, injection resistance and actual latency await owner testing. Mock-based checks prove application behavior only. No production rollout, staff activation, financial action or Stage11 automation is authorized.

## Verification

All modifying checks used new owned guarded disposable PostgreSQL databases; runners reported removal. No real application database or historical migration was touched.

- `npm run test:unit`:157/157 pass.
- TypeScript and lint:pass.
- `npm run test:local-ai-playground`:final1/1 pass. Actual native browser login and restricted worker, three user turns, exact claim-only history, no re-sent model text, source details, malicious fact promotion502 and unknown references502, explicit reset during an in-flight reply, reload clearing, English/Traditional Chinese, mobile/tablet/desktop no overflow, wrong Origin/header, forged context/role, invalid lengths, rate limits, suspension and deleted session denial. Domain snapshots unchanged. Browser errors stay checked; only the single intentionally induced502 console error is accepted by exact test assertion, not globally suppressed.
- Initial playground run failed because an alert locator matched both our visible error and Next's route announcer. Narrowed the locator to the intended error; no assertion timeout or product guard changed. Initial failure retained separately in evidence.
- Existing `test:local-ai-diagnostics` and `test:local-ai`:1/1 each pass, mock transport only.
- Existing `test:authorization`:8/8 pass.
- `test:support-staff-production`:1/1 pass, including the new playground payload refused404 despite development flags.
- `build:verify`:pass, normal production build in guarded owned harness.
- `test:local-ai-demo`:1/1 pass on visible Chromium under Linux test-only Xorg display. Existing native authentication, manual mock success/failure, retained window, SIGINT cleanup and external service survival remain intact. No change to launcher source.
- Screenshots in `screenshots/mock-*.png` are real application browser captures at1440/820/390px with explicitly mocked inference. They establish layout only, never genuine Qwen output or quality. Mobile capture visually inspected and overflow assertion passed.
- No genuine Qwen run here. Full unrelated rental/camera/meetup suites were not rerun or claimed. No production readiness or full-regression claim.

## File inventory

`AGENTS.md`; `components/support-companion.tsx`; new `components/local-ai-playground.tsx`; new `lib/local-inference/playground.ts`; `lib/local-inference/server.ts`; `package.json`; `tests/local-inference.test.ts`; `tests/local-ai.integration.test.ts`; `tests/support-staff-production.test.ts`; this report, verification ledger and three mock-labelled browser screenshots. No dependency versions, historical migrations, fixed datasets or launcher files changed.

## Offline branch transfer

No GitHub push is included in this implementation task. A review bundle can transfer the committed branch without publishing it. Download `hustlen-interactive-local-ai-playground.bundle` into Downloads, then in the existing Mac checkout containing R2:

```sh
git bundle verify ~/Downloads/hustlen-interactive-local-ai-playground.bundle
git fetch ~/Downloads/hustlen-interactive-local-ai-playground.bundle feature/interactive-local-ai-playground
git switch -c feature/interactive-local-ai-playground FETCH_HEAD
npm ci
```

Then use the same private owned-database startup wrapper and `npm run demo:local-ai` described above. This bundle requires the existing R2 ancestor; it does not contain environment files or the preserved troubleshooting stash. If this branch already exists locally, inspect it rather than resetting or overwriting local work.
