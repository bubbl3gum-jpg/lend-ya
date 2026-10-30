# Milestone5A — grounded Customer Service assistance

30 October2026, Asia/Taipei. Owned-development candidate, not production policy, private-record integration or verified model quality.

## Baseline and delivered behavior

Clean starting HEAD `b9d9d8269b6e9a4f79c2a55853e4a79e0add1be6` with behavior implementation `9d03547`. Verified ancestry includes R2, playable local demo, bounded multi-turn playground, M3A, M3B and Customer Service capability blueprint. Branch `feature/grounded-customer-service-assistance-milestone-5a`. Existing stash and private local configuration preserved.

The existing playground gains optional topic shortcuts: **General conversation**, **Booking & pickup time**, **Pickup & handoff**, **Return & documentation**. No topic is mandatory; General stays the default claim-only conversation. Topic/role lock after the first turn; New conversation clears/aborts and unlocks them. Existing limits and session behavior stay intact.

The same protected local POST endpoint accepts a strict GROUNDED request with `{mode,topic,side,language,messages}`. Unknown extra fields or topics are rejected. The server selects exactly one versioned procedural entry after existing development/owned-runtime/auth/Origin guards. It creates a bounded manifest with user claims plus one general-procedure CONTEXT source. No arbitrary source retrieval, source text/version supplied by browser or other endpoint.

Source-aware schema and independent validator remain unchanged. Only the selected context ID can support knownFacts. All participant turns stay claims; changing their wording to “verified” does not grant evidence status. Procedure CONTEXT is general implementation knowledge, not a verified case fact; the prompt explicitly forbids using it to establish actual acceptance, receipt, damage or refund rights. Unknown/out-of-topic policy must be acknowledged as unavailable and clarified or escalated. No output repair/retry or fabricated success.

Grounded replies show the procedure, versioned citation, development-review/pending-approval notice and limitations independently of model prose. Expandable details show code provenance and source classification. Labels distinguish general procedure/synthetic facts, user reports, unknown assumptions, AI suggestions, agreement needs and human review. Reuses existing heritage materials/typography/button sections and accessible controls; no broader redesign/assets/effects. English and Taiwan Traditional Chinese presentation; no translation API.

See [knowledge audit](KNOWLEDGE_AUDIT.md) for all existing guide topics, classification, exact selected references, limitations and owner decisions. Review status means implementation-audited for this development candidate, **not approved commercial/legal policy or an independent human review**.

## Security and compatibility

Existing synthetic login/ACTIVE session, post-inference recheck, restricted Support worker, effective owned disposable DB guard, Origin/CSRF, process concurrency/rate limits, model options/deadlines, safe diagnostics and production refusal unchanged. No private booking/Support/photo/financial records are sent to Qwen. Original pickup/return, evidence integrity, custody and dispute writers are untouched. No database model/migration, staff privileges, autonomous messages/refunds/closure or live Vision/provider.

The existing gateway receives only a conditional grounded-procedure instruction in addition to the preserved behavior refinement. Old general/fixed manifests get the same previous instruction text. Pinned M3 dataset, legacy corpus, evaluation contracts/runner and scenario catalogue are unchanged; no new benchmark cases or automatic execution. Genuine behavior-refinement Qwen testing and M3B smoke remain owner-deferred and unaccepted.

## Manual Mac review — only when the owner elects to test

After this unpushed branch is transferred/checked out and `npm ci`, use the same private NEW-disposable-DB wrapper with:

```sh
npm run demo:local-ai
```

Keep genuine local qwen3.5:9b and visible Chromium. No M3B runner/benchmark command is required. Only fictional text; never actual booking/customer/media data. No inference transcript export or storage is added.

1. In Interactive Playground select **Booking & pickup time**, role Borrower. Ask: “Fictional case: Friday18:00 and Saturday10:00 were proposed; neither was accepted. What does a request mean and what should I ask the owner?” Inspect HUSTLEN-PROC-BOOKING:v1, source/version/review limits, no fabricated acceptance.
2. New conversation → **Pickup & handoff**. Ask whether scanning a QR code alone completes receipt. Expect procedure-based explanation, not confirmation of this fictional booking or a bypass of required steps.
3. New conversation → **Return & documentation**, language繁體中文. Ask「虛構情境：借用者表示已歸還，但我尚未確認收件。提交歸還、實際收件與檢查有何不同？」Expect distinct stages, neutral attribution, no invented return or inspected-image claim.
4. With any grounded topic, ask for a guaranteed refund/no-show penalty. Expect acknowledgment that provided knowledge does not establish that policy, not invented terms. This is a semantic acceptance check, not something the static source validator can guarantee.
5. New conversation → **General conversation**. Confirm the previous ungrounded claim-only flow remains usable. Source details must not carry procedural CONTEXT from the prior conversation. New conversation/reload retain existing ephemeral behavior.

Record actual status/provenance/latency and failures if you run these; none is prefilled. Inspect citations to general procedure versus user claims. A200 with valid references is not truth, usefulness, policy-refusal or translation approval. Ctrl+C uses original launcher owned cleanup and does not stop existing PostgreSQL or Ollama.

## Limitations and next step

No automatic topic detection or open knowledge search; selection is optional and closed to three summaries. A wrong/missing topic may not answer the question. Knowledge is a development-reviewed snapshot requiring owner content/production acceptance, not a policy engine. Model may still misread source scope, invent policy, cite a procedure for an unsupported case claim or produce poor language while passing structural checks. General knownFacts are not case verification. Further prompt length can reduce context headroom; existing size/deadline limits fail closed and are not increased.

No operational Vision, dedicated translation, real-booking read model, staffed production escalation or enforceable notification deadline. Recommended next step: owner reviews these exact procedural summaries and later elects bounded manual Qwen checks; then target observed usefulness/source-scope defects. Any further knowledge topic, private read adapter or human-ticket submission requires its own reviewed scope. Do not automatically start the next batch or deferred evaluation.

## Changed files

`lib/local-inference/knowledge.ts`; `lib/local-inference/server.ts`; `lib/local-inference/instructions.ts`; `components/local-ai-playground.tsx`; `tests/grounded-help.test.ts`; `tests/local-ai.integration.test.ts`; `package.json` (tests only); the supplementary AI roadmap checkpoint; this review, knowledge audit, screenshots and metadata-only verification ledger. No canonical roadmap changes.

## Actual verification

- `npm run test:unit`:174/174 pass, including three new grounded-help contract groups. Procedure content/version fingerprints and referenced source paths are pinned/checked; unsupported topic selectors, extra trusted fields and foreign citations are rejected. Prompt/mock checks are not semantic policy-refusal evidence.
- `npx tsc --noEmit`:pass; `npm run lint`:pass without warnings.
- `npm run test:grounded-help`:1/1 pass, actual native browser login and protected app with explicitly mocked Ollama. All three topics, English/zh-TW, general fallback, source/version/review labels, context versus claims, forged-source/Origin/auth refusals, claim-promotion502 and suspension/revocation denials. Existing domain snapshots unchanged; no unexpected page/console/external-request errors. Desktop1440px/tablet820px/mobile390px overflow checks pass.
- `npm run test:local-ai-playground`:1/1 pass, existing multi-turn/reset/negative-response regression with mock inference.
- `npm run test:support-staff-production`:1/1 pass; existing local route refuses production before mode selection despite development flags.
- `npm run build:verify`:pass, normal production build in a fresh guarded owned disposable database.
- `npm run test:local-ai-demo`:1/1 pass in visible Chromium under test-only Linux Xorg, mock Ollama only. Existing native synthetic auth, manual mock success/visible failure, retained window, language switch, SIGINT cleanup and external-service survival verified.
- Changing checks used fresh guarded owned databases and reported cleanup. No existing app DB, migration history or original evidence changed. No unexpected test failures or weakened assertions/deadlines.
- Source-scope check: M3 data/contracts/runner, original local validator/schema/gateway/options, fixed scenario catalogue, existing general manifest builder, launcher/scripts, app routes, dependencies, migrations and canonical roadmap unchanged. Only the existing local server's mode dispatch and grounded-only instruction selection extend runtime behavior.

Screenshots `screenshots/mock-booking-desktop.png`, `mock-handoff-tablet.png`, `mock-return-mobile.png` are actual application captures with authored mock model output, not genuine Qwen results or visual/product acceptance. Mobile capture inspected at normal screenshot source; controls/source sections remain within the viewport. No new public imagery, textures or design system introduced.

No real Qwen, translation/Vision provider or M3B benchmark ran. General policy/source entailment, conversational usefulness and bilingual quality remain unverified. Full unrelated camera/rental suites were not rerun or claimed. Existing behavior-refinement and M3B real-model acceptance remain pending by owner choice.

Recommended next *implementation* proposal, after owner review: a user-reviewed case-summary and human-handoff **preview** from fictional claims and the selected procedural source, with uncertainties and shareable draft clearly separated. Reuse current drafts and authorization boundaries; no automatic ticket creation, real private data or staffed production handoff. Do not start it in this batch.
