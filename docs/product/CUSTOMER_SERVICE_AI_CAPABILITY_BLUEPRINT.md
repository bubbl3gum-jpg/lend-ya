# Hustlen’ — Customer Service AI capability blueprint

30 October2026, Asia/Taipei · proposed product specification for owner review, not implementation or production policy.

**Audit baseline:** clean `feature/protected-ai-evaluation-runner-milestone-3b`, HEAD `e557a5181f7e421b64bb3576f69157ec3486626b`. Design branch `docs/customer-service-ai-capability-blueprint`. M3A foundations and M3B runner are implemented candidates. **Owner deferred genuine M3B smoke testing; neither M3B nor M3C has real-model acceptance.** Earlier owner-reported exploratory Qwen results do not substitute for it. M3C is not implemented here.

This specification refines the Customer Service direction in [the canonical AI product blueprint](HUSTLEN_AI_PRODUCT_BLUEPRINT.md). It preserves the [fourteen-stage project roadmap](../roadmap/MASTER_ROADMAP_14_STAGES.md), [supplementary AI roadmap](../ai/MASTER_AI_DEVELOPMENT_ROADMAP.md), and all unfinished production/policy/visual gates. Nothing below activates a provider, role, record reader or action.

## 1. Product contract and capability matrix

A hybrid assistant offers **general conversational help**, **structured case assistance**, and **human escalation**. It explains, clarifies, organizes and drafts. It does not decide guilt, liability, financial outcomes, identity, custody or dispute resolution. A selected role is conversational perspective, never authorization; future case role must come from authenticated booking participation.

| Stage / issue | General help — no private record needed | Future case-specific help — authorized facts only | Mandatory boundary / human escalation |
| --- | --- | --- | --- |
| Booking/request | Explain request versus acceptance; ask which dates and arrangement need clarification. | Compare participant's question with the exact accepted booking/terms and authorized agreement version. | Never invent availability, acceptance, cancellation policy, fees or an amendment; unclear terms go to human review. |
| Pickup preparation | Explain agreed station, checklist and camera/location permissions; troubleshoot visible non-secret errors. | Identify which actual checklist/verification/receipt step remains incomplete. | A proposal is not an agreement. QR/GPS alone is not physical receipt; no bypass, fabricated arrival or TEST_LOCATION represented as real MRT verification. |
| Pickup disagreement/no-show | Ask agreed time, what each person reports and what is unconfirmed; draft neutral clarification. | Organize permitted event timestamps without inferring arrival, guilt or a sanction. | Safety, conflicting receipt or failed essential verification escalates; no automatic penalty/cancellation. |
| During rental | Explain supported documentation and communication steps; help formulate a scheduling request. | Summarize exact agreed dates and participant-provided issue history. | No unapproved extension, repair instruction implying expert safety assurance, custody override or contract change. Immediate danger: stop troubleshooting and seek appropriate local emergency help; do not promise monitoring. |
| Return | Explain submission, verification and physical receipt as separate steps. | Show the scoped authoritative return/receipt event and unresolved steps, or explicitly unavailable state. | Reported return is not verified return. Do not infer possession or require repeating a completed physical return merely because a dispute is open. |
| Post-return inspection | Guide factual condition/accessory descriptions; preserve originals, acknowledge missing views. | Organize authorized pickup baseline, return and later material with exact provenance and accepted accessory snapshot where present. | Text-only assistant has not inspected images. No historical-pickup retakes, silent evidence replacement, invented damage/causation or repair valuation. |
| Condition dispute / response | Clarify allegation, uncertainty, disagreement and requested help; draft a neutral factual response. | Summarize permitted allegation/response and evidence references for the actual participant. | Silence is not admission. No automatic deposit deduction. Deadline exceptions, contested facts and serious consequences require authorized humans. |
| Mutual recovery | Suggest voluntary clarification, accessory checks, documentation or human assistance. | Explain authorized existing proposal states separately from execution/completion. | Mutual agreement is required through the real workflow. An accepted coordination proposal is not money transfer, completed recovery, case closure or waiver. |
| Payments / account access | Distinguish rental fee from deposit; guide genuine sign-in and non-secret error reporting. | No financial/identity inference in first release. | No refund guarantee, account recovery, suspension bypass, identity verification or collection of passwords/ID documents. |

“Future case-specific” is a dependency designation, not a claim the model currently reads these records. General procedural explanations also need reviewed, versioned knowledge: source code establishes implemented behavior, not a newly approved legal or commercial policy.

## 2. Conversation and case-assistance workflow

**Listen → establish perspective/stage → check sources → clarify → advise/draft → offer human handoff.**

1. Identify the question and desired outcome before answering. Ask whether the person is the owner or borrower and which step they mean when unclear. Do not require a booking ID for general help. A vague “it wasn't confirmed” needs clarification, not a guessed event.
2. In general mode, distinguish “according to your description” from an application-verified event. Tentatively label the stage and let the person correct it. In future linked mode, use server-resolved participation and scoped lifecycle facts; contradictory claims remain visible rather than overwritten.
3. Maintain a compact case summary: question, viewer perspective, stage/source, agreed versus proposed arrangements, reported concerns, verified event references (if authorized), unknowns, preserved evidence references and the next question. Mark each statement's provenance and timestamp meaning. Model summaries and repeated AI text never become verified evidence.
4. Ask one or two useful questions at a time; do not ask for data already safely supplied. Examples: which pickup time was accepted? Is the charger still unconfirmed? Can the existing original images document that area? Do not request sensitive identity/payment details or private counterparty conversations.
5. Recommend the smallest feasible next step for the lifecycle. After a rental, preserve original pickup images; any new capture is later supplemental material, never a replacement pickup record. State uncertainty and what would require human judgment. No claim that the assistant viewed an image unless a separately approved provider actually produced attributable observations.
6. Draft a neutral message in the correct voice and to the correct counterparty. Example, borrower: “Could you confirm whether Friday18:00 or Saturday10:00 is acceptable? I have not yet agreed to either.” Prefer「物主表示」「借用者」where appropriate; avoid accusatory wording or implied admission. Drafts remain editable and unsent.
7. Offer escalation when evidence conflicts, essential verification fails, the next step requires authority, the user requests a human, repeated advice is unhelpful, or privacy/safety is at risk. Never force agreement/liability as a condition of help.

**Case pattern:** reported scratch after return → confirm text-only/no inspection → identify original pickup/return evidence and lighting limitations → ask which difference is actually observable → suggest neutral factual clarification → draft owner-to-borrower message → offer human investigation. Physical return remains separate from inspection/dispute and future financial state.

**Human handoff:** prepare a user-reviewed summary and minimum permitted source references. Preview exactly what will be shared and with whom. Creating a ticket, sending a message and adding evidence each need separately authorized existing service operations and explicit confirmation; consent alone does not grant access rights. Only a successful persisted operation may show a ticket/message receipt. Created, queued, delivered, assigned and answered must be distinct states. Current development Support links are not a production staffed handoff or response-time guarantee.

## 3. Information and authorization boundaries

| Information | Current safe availability | Boundary for future model use |
| --- | --- | --- |
| Fixed synthetic sources and fictional user turns | Available to local Qwen in owned development only (`lib/local-inference/catalogue.ts`, `playground.ts`, `server.ts`). | Fictional input stays PARTICIPANT_CLAIM. Browser cannot invent CONTEXT; no real customer text authorized by this pilot. |
| Procedural guide text | Available to the existing **deterministic** GUIDE, not automatically injected into Qwen: `lib/assistant/guidance.ts`, `compose.ts`. | Curate reviewed public-facing knowledge IDs, approved scope/version, effective date and source references before grounding Qwen. Unknown policy stays unknown; no invented refund/no-show rule. |
| Booking participation, times, station, price and lifecycle | Application models exist: `prisma/schema.prisma:194`, `lib/rental-lifecycle.ts`. Not read by the Qwen gateway. | Future exact-booking read DTO, actual requester authorization, minimization, freshness and per-read audit/recheck. Authenticated session or matching numeric ID alone is insufficient. |
| Accepted item documentation / agreements | Owned-development immutable designation/acknowledgement exists in `lib/rental-documentation/service.ts` and `contracts.ts`. | Use the exact accepted context/version, never latest listing/current owner declaration as a historical rental baseline. Review production compatibility first. |
| Return receipt / inspection window | `lib/inspection/service.ts:20` and `contracts.ts` derive window from completed return receipt/challenge, not the browser clock or report alone. | Retrieve minimum authoritative state through future scoped integration. Intended24h inspection rule is not blanket approval of production exceptions/cutover. |
| Original pickup/return and later evidence | Participant-protected bytes via `app/api/bookings/[id]/evidence/[photoId]/route.ts`; provenance structures in inspection/documentation services. | Access to bytes does not authorize transmitting them to a model. Initially reference metadata only after permission review; preserve source, stage, author/time and originals. Separate explicit/admin-audited routes are not universal assistant access. |
| Claims, borrower responses, recovery proposals | Development-gated durable flows in `lib/condition-claims/service.ts`, `contracts.ts`, `lib/recovery-room/service.ts`. | Reuse actual participant/service authorization. Opening a dispute never reverses recorded physical return. AI does not submit or accept proposals automatically. |
| Private Support messages and ticket events | Existing deterministic COPILOT can read **only** its independently assigned channel via restricted worker: `lib/assistant/server.ts:33`, `lib/support-staff-candidate/bridge.ts`, `service.ts`. | Qwen receives none of these. Future access needs exact-purpose field/channel/actor approval, consent/retention review, assignment/assurance and revocation checks. Do not merge owner/borrower private conversations or expose internal notes. |
| Borrower response deadline / delivery | `lib/condition-claims/contracts.ts:16`: test delivery clock only, realDeliveredAt null, responseDeadlineEnforceable false. |48h proposed response period needs approved qualifying delivery, failed-delivery/exception policy and reliable recorded event. Queued/viewed is not proof; no AI-created clock or automatic liability. |
| Images interpreted by Vision, ID/liveness, refunds/financial authority | Unavailable to this assistant. `lib/item-documentation/vision-contract.ts` returns UNAVAILABLE; `lib/inspection/future-contracts.ts` blocks provider execution. | Separate Vision research/selection, identity and financial policies/approvals. Existing photo heuristics/capture are not operational Vision. Never collect or expose biometric/identity credentials here. |

Future retrieval must be narrow, read-only and server-mediated: authorize each resource/action, return allowlisted fields with stable references and freshness, then independently validate model output. Recheck session/resource authorization before releasing protected content. On revocation, fail closed; never use an old model summary/cache as a private-data access bypass. Separate private staff material from participant-visible explanations. Redaction, retention and cross-user isolation must be reviewed; a prompt is not an access-control system.

## 4. Customer-facing UX proposal

Use the existing heritage typography, parchment/soil materials, restrained ruled sections and accessible clean controls. No generic AI dashboard, new particles/sound or broad redesign. Stage9 aesthetic approval remains outstanding.

- **Entry points:** general Help/“Ask about renting”; future booking-local “Get help with this rental”; future Support “Prepare a summary”. All are proposed entry points, not shipped links. Show whether the assistant is using only the person's description or specifically authorized application facts.
- **Conversation:** natural language first; optional issue shortcuts. Keep the relevant stage and role visible without turning every answer into a form. Structured “Case notes” and expandable “Sources and uncertainties” supplement the conversation.
- **States:** general/unlinked → clarifying → ready-to-advise → generating → advice/draft → handoff-preparation. Separate waiting-on-person, unavailable-information, session-expired, cancelled, rejected-output, rate-limited and service-unavailable states. A state is not a booking transition.
- **Actions:** copy/edit a draft, inspect sources, open the real existing workflow when authorized, ask a human, start a new discussion. No AI “Mark returned”, “Refund”, “Resolve dispute” or one-click binding agreement. Do not invent working production links; unavailable services are labelled honestly.
- **Errors:** preserve the user's unsent text and earlier valid messages separately, explain no valid new result was produced and offer deliberate retry/exit/human-help where available. No automatic retry or scripted replacement. Session loss clears access to protected case details and leads to genuine sign-in; it never fabricates completion.
- **Language/accessibility:** en/zh-TW, neutral Taiwan wording, keyboard/focus/touch support, responsive mobile layout and reduced-motion preferences. Sources retain their original meaning. Current language switching does not translate prior replies; until approved translation exists, label response language and avoid implying automatic conversion.

Future conversation retention, deletion, device/session behavior and any cancel-without-discard UX require product/privacy decisions. Reuse the current bounded-memory prototype; do not assume a durable customer transcript store already exists.

## 5. Repository gaps and recommended implementation sequence

| Existing and reusable | Missing / proposed increment |
| --- | --- |
|18 issue guides and deterministic guide/draft composition | Reviewed policy knowledge release process and model grounding; no approved general commercial policy engine. |
| Local Qwen, fixed scenarios, claim-only bounded playground; independent source validator | Reliable stage/role awareness, feasible actionable advice and calibrated semantic checks. Prior pilot found impossible retake, implied image inspection, perspective and tone weaknesses. |
| M3A24-case dataset, partial-review contracts; M3B protected selected-case runner | Genuine M3B baseline **deferred**, not accepted; numerical thresholds/retention/export still pending. JSON validity is not quality. |
| Rental, evidence, claims, agreements and recovery development flows | Purpose-specific read DTOs, reviewed production policies and per-user Qwen access, not a blanket record connection. |
| Private tickets/channels and assigned-worker read/audit protections | Approved staffed escalation, participant sharing/mediation rules, production activation and real notification semantics. |
| en/zh-TW UI and bilingual model drafts | Dedicated translation adapter/provider; production-approved retention/cost terms and integrity checks. |
| Image capture/checklists/quality heuristics and unavailable Vision contract | Provider research/selection and approved Vision evaluation. No accepted operational Vision AI. |

**Sequence, not authorization:**

1. Owner approves this behavior/initial scope and the exact knowledge and escalation boundaries. Keep general self-reported case advice separate from any actual-record integration.
2. Implement a small behavior correction for role/stage clarification, historical-photo feasibility, neutral drafts and explicit text-only limitations, reusing existing Qwen/guide/validator infrastructure. Preserve original outputs and add focused regression cases. Scope requires separate approval; do not rebuild evaluation/playground.
3. When owner chooses to resume genuine evaluation, approve a bounded baseline scope and any storage policy first; use M3B to compare observed behavior. No acceptance is inferred while that test remains deferred. Human judgment reviews usefulness, attribution and language, not just JSON.
4. Separately design and approve a minimal case read adapter plus versioned policy grounding. Only then implement server-authorized case facts, freshness/revocation and visible sources. No free-form DB/tool access.
5. Approve and integrate human escalation using existing ticket/channel services, explicit share/submit confirmation and honest delivery states. Keep owner/borrower private conversations separate; no autonomous case actions.
6. Translation and Vision remain independent workstreams: reasoning/validated canonical answer before translation, no pretranslation of evidence; Vision research and provider approval before image inference. Neither is silently selected or a prerequisite excuse to fabricate capabilities.

## 6. First usable release acceptance — proposed, pending owner approval

First scope: **general conversational help plus structured self-reported case clarification, neutral drafts and an honestly available human route**. This may be an owned-development release candidate first; customer production rollout remains separately gated. It must not present linked-case verification until scoped retrieval is approved and tested.

- Correctly distinguish request/acceptance, proposal/agreement, QR/physical receipt, return/inspection/dispute and coordination/execution. Preserve uncertainty, negation and en/zh-TW dates/amounts.
- Owner and borrower receive correctly directed, concrete feasible advice; no original-evidence replacement, impossible historical capture or implied image analysis. Unknown policy or missing facts triggers clarification, not invention.
- Every displayed source supports its adjacent statement; participant text and AI suggestions never become verified application events. Wrong role, foreign source IDs, forged trusted sources and inaccessible records are rejected independently of the model.
- Drafts remain editable/unsent; no binding refund, liability, financial, custody, identity, sanction or dispute action. A human request is possible without agreeing to fault. If staffed Support is unavailable, say so instead of claiming transfer or a response promise.
- Meaningful bilingual conversations, errors, cancellation and mobile/keyboard interactions are demonstrated by actual owner testing. Real quality/latency and failures must be observed; neither M3 mocks nor the five earlier exploratory outputs complete this release gate. No numerical quality threshold is approved here.
- Any later linked-case/handoff release additionally proves per-user resource isolation, revoked/stale-session denial, minimized/audited reads, original evidence preservation, user-reviewed sharing and real submission receipts. Missing delivery cannot start an enforceable48h clock.
- Production release requires approved model/data processing, retention, notification/escalation operations, privacy/security and rollout decisions. No production activation follows from this blueprint.

## Review record

Documentation-only source audit; no tests or model/database operations were needed or performed for this change. Existing M3 verification remains historical evidence, not freshly rerun acceptance. No runtime source, evaluator, validator, corpus, roadmap or migration changed. Proposed capabilities, missing integrations and unresolved approvals are intentionally separate from implemented behavior. Stop for owner review; no implementation, push, merge or deployment.
