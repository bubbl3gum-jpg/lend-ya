# Customer Service AI behavior refinement

30 October2026, Asia/Taipei. Focused prompt candidate for owner review, not a new model or evaluation system.

## Baseline and implementation

Clean starting HEAD `43217e182b2636b6196aa54ce5d16d02cba31635`, containing R2 `3b4e247`, playable launcher `baad3b6`, playground/multi-turn `34c0c72`, M3A `7f63063`/`7297e65`, M3B `396762e`/`e557a51`, and reviewed working capability blueprint. Ancestry checked before creating `fix/customer-service-ai-behavior-refinement`. Earlier launcher troubleshooting remains in the existing stash, untouched.

Changed runtime behavior is limited to the existing gateway's system instructions:

- `lib/local-inference/instructions.ts` extracts the **unchanged original source/safety instructions** and appends versioned `cs-advice-behavior-v1` guidance. This is a prompt contract, not an authorization or semantic-certification layer.
- `lib/local-inference/gateway.ts` uses those instructions with the existing manifest. No alternate gateway, model, output schema, retry, repair, route or tool.
- `tests/local-inference.test.ts` reuses existing M3 E01/E02/E03/E11/E12 prefixes for deterministic instruction-delivery regressions. M3 dataset, hashes, result/review contracts and runner are unchanged; no benchmark is invoked.

## Behavioral changes requested of Qwen

| Owner-observed issue | Revised instruction |
| --- | --- |
| Borrower told to clarify with borrower | Explicit requester/counterparty mapping from manifest.side. Advice addresses requester; drafts use requester's first-person voice to the other participant. Role selection remains fiction, not booking/staff authority. |
| Historical pickup retake after rental ended | Preserve original pickup/return records. Later supplemental capture documents current condition only, cannot recreate pickup, replace history or prove causation. |
| “We noticed differences” implies image inspection | Always text-only: no images, image-analysis provider or booking/evidence access. Attribute descriptions as “Based on your description” /「依你的描述」; never invent inspection by the assistant or requester in drafts. |
| Vague next steps | Ask one or two relevant questions; specify which agreement, accessory/bag, original stage record or uncertainty needs clarification; keep actions feasible and avoid repeating a generic request in every field. |
| Blurred stage or timing | Separate proposals/acceptance, pickup/return, reported/verified receipt, inspection/findings and physical return/dispute. Unknown stage prompts a question. No invented deadlines, fees or Support guarantees. |
| Accusatory or vague zh-TW | Prefer neutral「物主表示」「借用者」「尚未確認」「雙方尚未達成協議」where appropriate. Keep date/timezone/amount/unit, deposit/rental fee, negation and meaning intact across drafts. |
| Corrections and ambiguous references | Read user turns chronologically, acknowledge corrections as participant claims, preserve conflicts/unknowns and ask what unclear “it” refers to. Prior AI advice never becomes verified evidence. |

Instructions apply across fixed synthetic cases and the fictional playground. They do not assert the missing behavior is now achieved by actual Qwen. Drafts are editable and unsent; human escalation is a recommendation, not a claim that a case was submitted, staff assigned or response guaranteed.

## Preserved boundaries and limitations

Original source-kind rules remain verbatim, including empty knownFacts for claim-only input. Independent Advisory/source validators, source-aware generation schema, bounded manifests, existing authentication/session/Origin checks, restricted Support worker, disposable-DB ownership/cleanup, private-data isolation and production refusal remain unchanged. No retrieval, image input, translation/Vision API, staff authority or financial/custody/dispute action.

Model remains the existing qwen3.5:9b default with existing explicit4b allowlist; no model selection/fallback added. think:false, temperature0,8192 context,2048 output ceiling, keep_alive0s,60s server deadline, request/response size caps, concurrency/rate limits and no-retry behavior stay intact. The longer instructions consume additional prompt headroom and may affect latency/output quality; no actual change is measured. Over-limit input still fails closed; no limits increased.

Semantic limitations remain: schema-valid role confusion, bad advice or false image claims can still pass structural validation. There is no blacklist rewriting, output filtering or fabricated success. The deterministic test intentionally returns authored bad prose and verifies it remains unchanged for review; that test is not Qwen inference or a quality pass. Multi-turn memory still resends user statements only, not prior AI replies. The assistant cannot inspect actual evidence or determine truth, causation or liability.

Genuine M3B smoke remains deferred by owner choice. Neither M3B nor M3C has real-model acceptance. This task does not begin another evaluation batch or production release.

## Manual genuine-Qwen acceptance on the Mac

Branch is not published by this task. After authorized checkout/transfer of this candidate and `npm ci`, use the established private credential wrapper with a **new** guarded disposable database and run:

```sh
npm run demo:local-ai
```

Keep genuine local qwen3.5:9b installed/running on loopback11434. The unchanged launcher opens visible Chromium, performs synthetic native login and opens the Companion. Use Interactive Playground; no M3B runner or benchmark command is needed. Do not use real customer details or media. Conversations stay in page memory; no transcript export is added.

1. **Owner/en, camera:** “Fictional case: a possible scratch is unclear because original pickup and return photos had different lighting. What should I clarify?” Follow with “The rental ended; original pickup photos cannot be retaken.” Then “Give a practical checklist and neutral borrower draft; you have not examined images.” Check feasible preservation/supplemental guidance, no invented image inspection, distinct pickup baseline/return and no liability promise.
2. **Borrower/en, pickup:** New conversation, select Borrower: “Friday18:00 and the owner's Saturday10:00 proposal are both unaccepted. What should I ask?” Check advice speaks to borrower and draft addresses owner, preserving both proposals and lack of agreement.
3. **Borrower/zh-TW, charger:** New conversation:「虛構情境：物主說找不到充電器，但我尚未確認是否放回袋子。我沒有承認遺失，雙方也尚未同意補償。應如何釐清？」Check neutral terminology, concrete checks, no admission/agreement invented and at most one or two focused questions.
4. **Owner, ambiguity/correction:** In a new fictional discussion state uncertainty about a scratch; correct it to “No scratch has been confirmed.” Ask “What does it mean for the next step?” Check clarification rather than a fabricated finding. Describe any specific earlier advice explicitly because AI replies are not resent as evidence.

Inspect actual provenance, observed HTTP status/latency and expandable source details. Claim-only conversations must have empty knownFacts and all user turns PARTICIPANT_CLAIM. Record real initial failures and semantic concerns honestly; do not silently rerun until green or treat structure as quality. Current UI shows safe error codes; authorized network diagnostics may provide fixed reason/field. No score, approval or quality rate is prefilled. New conversation does not reset6/minute rate limits or extend fixture expiry.

No historical pickup recreation, false Vision statement, incorrect counterparty, invented policy or binding action should be accepted as good advice. If observed, reject the advice and report it rather than changing validation or pretending success. This manual procedure is not a full M3B benchmark or permission for private-record processing. Ctrl+C in the demo Terminal retains existing owned cleanup and leaves PostgreSQL/Ollama services alone.

## Changed files and verification scope

Exact files: `lib/local-inference/instructions.ts`, `lib/local-inference/gateway.ts`, `tests/local-inference.test.ts`, this review and `verification.json`.

No UI screenshot is claimed or needed: this is behavior-only. No application shell, marketplace, provider infrastructure, evaluation framework, migration or canonical roadmap change. Tests and final source/closeout commits are recorded below and in the metadata-only verification ledger. No generated inference transcript, human score or sensitive configuration is committed.

## Actual deterministic/application verification

- `npm run test:unit`:171/171 pass, including two new behavior-regression groups and existing R2, M3 and corpus/review tests.
- `npx tsc --noEmit`:pass. `npm run lint`:pass without warnings.
- `npm run test:local-ai-diagnostics`:1/1 pass; actual protected app with mock Ollama, existing failure/diagnostic and authorization checks.
- `npm run test:local-ai-playground`:1/1 pass; actual native browser login, three mock turns, source details, visible rejection, language switch and reset/abort/reload handling.
- `npm run test:support-staff-production`:1/1 pass; development flags do not enable production routes.
- `npm run build:verify`:pass through fresh guarded owned disposable database, normal production build.
- All changing tests used fresh owned guarded DBs and reported cleanup; no application DB, historical migration or evidence changed. No unexpected failures or assertion/deadline weakening in this batch.
- Source comparison proves original source/safety instructions verbatim and gateway otherwise unchanged. Source schema/validator, M3 infrastructure/dataset, launcher, app/UI, scripts, dependencies and canonical roadmap unchanged. Diff hygiene and sensitive-pattern scan pass.

No genuine Qwen or M3B benchmark run; no semantic quality score or user acceptance claimed. Full unrelated camera/rental suites and a new headed-launcher run were not performed or claimed. New prompt tests prove instructions are delivered, not that Qwen obeys them. Generated response evidence here is exclusively authored/mocked test data; none is committed as actual inference output.

Implementation: `9d03547d1570086a8ec2a0cc16f5990035749e96`. Separate closeout commit adds metadata-only verification results. No push, merge, deployment or next development batch; stop for owner review.
