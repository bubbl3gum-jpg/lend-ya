# Milestone5B — structured fictional Customer Service assistance

30 October2026, Asia/Taipei. Owned-development candidate; no real-record integration, semantic model acceptance or production activation.

## Baseline and M5A prerequisite status

Clean starting HEAD `d5a4d046d55d10715c2cececd01bf0f2b336df2b`, containing M5A implementation `c459e0245b8468bd7b37ac2c678b2e66fedbe5d1`, behavior refinement, R2, playable demo and M3A/M3B. Branch `feature/structured-customer-service-case-assistance-milestone-5b`; existing troubleshooting stash retained. M5A's original174-test/grounded-browser/launcher evidence remains historical; current suite repeats source pins and relevant app checks.

M5A BOOKING/HANDOFF/RETURN sources, stable versioned citations, content fingerprints, review statuses and limitations are **unchanged**. `tests/grounded-help.test.ts` still pins all three descriptions. Status remains implementation-reviewed development candidate, owner content/production approval PENDING, never approved commercial/legal policy. Its gaps also remain: no general semantic refusal guarantee, no actual booking/evidence access, no staffed production Support or reliable notification deadline. Genuine M5A/behavior and M3B smoke acceptance remain deferred, not silently completed by this milestone.

## Implemented scope

Enable the optional **Enable fictional Case Notes** checkbox before the first turn in the existing playground. Default conversation, fixed scenarios and M5A grounding remain unchanged. Topic/role/notes mode lock after first turn; New conversation clears content and unlocks settings without resetting server rate limits. No mandatory case form.

The new strict CASE_ASSISTANCE operation uses the existing protected local endpoint and unchanged playground or grounded-help manifest builder. GENERAL produces claims only; the other topics reuse the same M5A source selector. Every user turn remains PARTICIPANT_CLAIM. Only static general procedures can be CONTEXT; the browser cannot submit sources, case records, role authority, reviewer status or policy. Final manifest retains the12000-byte cap.

The original Advisory already provides participantClaims, uncertainties, nextSteps, requiresAgreement, humanReview and en/zh-TW drafts. These are reused rather than duplicated. Only missing classification/clarification metadata is added in a **scoped response variant**, `fictional-case-notes-v1`:

| Field | Independent contract | Meaning |
| --- | --- | --- |
| issueCategory | BOOKING_TIME, HANDOFF_ARRIVAL, UNVERIFIED_RETURN, CONDITION, ACCESSORY, AGREEMENT_COMPENSATION, UNCLEAR | AI-inferred topic, never guilt, entitlement or a financial decision. |
| rentalStage | BOOKING, PICKUP, IN_RENTAL, RETURN, INSPECTION, DISPUTE, UNDETERMINED | Tentative discussion stage, **not** verified custody/return/booking status. No RETURNED/COMPLETED status field. |
| basisRefs |≤6 distinct IDs from this manifest's participant claims only | Context for tentative classification; a procedure source cannot establish the case stage. Non-unknown category/stage needs at least one claim reference. |
| clarificationQuestions |0–2 nonblank bounded strings in requested language | Ask relevant missing information; empty allowed instead of fabricating questions. |
| version | Exact fictional-case-notes-v1 | Additive contract binding, never authorization. |

The gateway selects the variant only for the server-created case-assistance manifest. It reuses the existing source-aware schema for all original Advisory fields, then independently validates the additional closed object. Unknown categories, custody states, extra ticket/verified-record fields, unsupported sources, procedural-only classification basis and extra questions are rejected. Base Advisory validator, diagnostic allowlists and ordinary output contracts are unchanged. Regular requests still reject extra caseNotes. Nothing filters or repairs bad model prose.

## Case Notes and summary UX

Compact expandable Case Notes show inferred category/stage and reported perspective, unverified participant reports, missing/conflicting/uncertain information, focused questions, feasible AI suggestions and human-review guidance. **Verified application context is always labelled unavailable: no booking or verified case event was loaded.** General procedure text stays in its separate M5A section and cannot be displayed as proof that a return/handoff happened.

Human-review notes are model suggestions, not proof of a staffed transfer. Static UI makes clear no ticket was submitted or human receipt confirmed. Empty humanReview stays an honest absence, not an invented recommendation.

A user-triggered **Prepare local summary draft** action deterministically assembles original participant statements, their source IDs, the explicitly tentative classification and procedure citation IDs, plus a no-verified-record/no-liability/unsent disclaimer. It does not invoke Qwen again or summarize model statements into verified facts. It preserves original-language claims, uses English/zh-TW labels and does not silently truncate. Summary is at most8000 characters, locally editable, never automatically sent; status says prepared only after the action succeeds. The prepare button disables after preparation to avoid overwriting edits. Each reply's summary stays tied to that reply; later user turns do not rewrite it or resend it to the model. New conversation/reload/unmount clears it.

No ticket create/submit/assign endpoint, clipboard auto-share, persistence, raw log or notification. Existing Support tables/domain snapshots stay unchanged. No actual “submitted” state is available. Retains heritage paper/typography, native details, accessible explicit labels/focus, keyboard controls, responsive widths and current locale/appearance preferences; no design overhaul/effects/audio or new assets.

## Safety and limits

Existing native synthetic auth, ACTIVE/current-session checks, owned disposable effective-target guard, restricted Support worker, Origin/CSRF, process concurrency/rate, model options/deadlines, cancellation and cleanup remain. Same genuine local Qwen9b default; no added provider or silent model fallback. Previous AI statements/summaries are never resent as evidence. No actual bookings, conversations, photos, identity or financial data retrieved. Vision remains unavailable; no image-inspection claim or financial/custody/dispute action becomes authoritative.

The new schema/instructions cost some token/request headroom; unchanged byte/token/time limits may refuse a generation. Validation is structural/reference classification only: a plausible but semantically wrong category, irrelevant question, poor tone, false visual claim or financial statement can still be wrong despite passing. User-visible guidance remains advisory. No lexical grading, fabricated quality score, or claim of genuine Qwen improvement. Uncertainty/UNKNOWN values are allowed instead of filling gaps with invented details.

## Later manual Mac acceptance

This branch is not pushed. After authorized checkout/transfer and `npm ci`, use the established private **new guarded disposable DB** wrapper and:

```sh
npm run demo:local-ai
```

Keep genuine local qwen3.5:9b on loopback11434. In the visible Companion:

1. Enable fictional Case Notes; choose Owner and Return & documentation. Describe a fictional possibly missing charger after a reported return, explicitly saying receipt/loss are unconfirmed. Generate once; inspect genuine provenance/status/latency, source attribution and notes. The category/stage must be labelled tentative; verified case context must remain unavailable.
2. Correct an earlier statement (“No loss or compensation has been agreed”) and ask one specific follow-up. Inspect correct role, retained negation, useful one/two questions and no invented verified return, image inspection, agreement or money action. This is a human semantic check, not guaranteed by the schema.
3. Prepare summary. It must appear only after clicking, contain original reports/disclaimers, allow editing and remain unsent. Confirm further conversation does not send your summary edit to Qwen. No success message may imply a human received it.
4. New conversation → Borrower, Booking topic. Explain two unaccepted pickup proposals. Verify stage/role, neutral owner-directed draft and no confirmed appointment. GENERAL topic must still produce no procedure CONTEXT.
5. Repeat a fictional accessory/condition question with繁體中文. Notes and summary controls/labels must be natural; retain source wording, uncertainty and no admission. Question count ≤2. If information is ambiguous, expect UNCLEAR/UNDETERMINED or appropriately qualified inference, not invented facts.

Use only fiction. Record initial failures honestly; no automatic retry or full M3B benchmark. Rate6/min and fixture expiry remain; no need to export transcripts. Ctrl+C in the demo Terminal performs existing owned cleanup, not stopping PostgreSQL/Ollama. No model result, human score or acceptance is prefilled here.

## Changed files / next scope

New `lib/local-inference/case-assistance.ts`, `case-notes.ts`, `components/case-notes.tsx`, `tests/case-assistance.test.ts`; narrow integration in existing gateway, server, instructions and playground component; test registration in package.json and application integration test; supplementary roadmap checkpoint, this review and verification metadata. M5A catalogue/source content, original schema/validator, M3 datasets/runner/review formats, launcher, app routes, migration history and canonical14-stage roadmap unchanged.

Recommended next milestone proposal: owner review of this case flow and eventual bounded genuine-Qwen acceptance, then a separately approved development-only handoff to the existing synthetic Support intake, with explicit user confirmation and a real persisted receipt. Do not rebuild this summary preview. Actual ticket submission, private case retrieval, staffed production handoff and delivery/retention policies need separate scope/authorization. Do not start it now or rebuild evaluation infrastructure. No push, merge, deploy or automatic next batch.

## Actual verification and initial defects

- `npm run test:unit`:178/178 pass, including four new case-contract groups plus unchanged M5A source fingerprint, bilingual metadata, grounded-help and M3 contracts. Every declared issue/stage enum is accepted; unsupported states/fields, procedural classification refs, unknown refs, promoted claim facts and excessive questions are rejected. Mock gateway tests cover both perspectives/languages and source-preserving corrections; not actual semantic classification.
- `npx tsc --noEmit`:final pass. `npm run lint`:final pass without warnings. Initial TypeScript errors were test-helper union/empty-array inference and were corrected without changing runtime validation.
- `npm run test:case-assistance`:final1/1 pass, actual protected app/native browser with mocked Ollama: opt-in notes, unavailable case context, keyboard preparation, editable local summary retained over follow-up/not resent, reset clearing, zh-TW preparation, no unexpected browser errors,1440/820/390px overflow checks, bad classification/procedure-basis/claim-promotion502 refusals and unchanged domain snapshots.
- Initial case browser run failed to locate the prepared textarea by its implicit nested label. The accessibility snapshot showed the summary existed. Changed to a unique explicit label/id and asserted the textarea's value rather than text content; final run passed. Initial failure retained in test evidence metadata. No timeout increase, error suppression or weakened assertion.
- `npm run test:grounded-help`:1/1 pass; existing M5A source/version/pending-review/limitations and baseline general mode still work.
- `npm run test:local-ai-playground`:1/1 pass; existing conversation/reset/cancellation and negative-response checks preserved.
- `npm run test:support-staff-production`:1/1 pass; route refusal occurs before candidate mode dispatch despite development flags.
- `npm run build:verify`:pass, normal production build in fresh guarded owned disposable DB. Changing harnesses reported marked DB/upload cleanup. No existing DB, historical migration or original evidence operation.
- Source/diff checks preserve M5A catalogue/fingerprints, original independent source validator, M3 corpus/runner/contracts, scripts/launcher, application routes, dependencies, canonical roadmap and stash. Original inputs/output schemas remain unchanged for ordinary modes; only case mode selects the scoped variant.

Browser captures remain ignored test artifacts, not real inference transcripts. Mobile layout visually inspected from the actual mock application capture. No new visual approval claimed. A fresh `npm run test:local-ai-demo` passed1/1 in visible Chromium on test-only Linux Xorg with mock Ollama: native synthetic login, zero automatic generation, manual success/visible failure, retained window, language change, SIGINT owned cleanup and external-service survival. Launcher source remains unchanged. Full unrelated camera/rental suites were not rerun or claimed. No genuine Qwen, external provider, M3B benchmark, new human score or completed acceptance. Stop for review.
