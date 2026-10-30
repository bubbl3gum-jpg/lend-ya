# Milestone5A — procedural knowledge audit and review matrix

30 October2026, Asia/Taipei. Repository implementation review for owned-development grounding only; **not an independent human approval or a commercial/legal policy review**. No reviewer identity is invented. Owner production/content acceptance remains pending.

Classes: **1** implemented application behavior; **2** proposed/unapproved marketplace policy; **3** missing/uncertain information; **4** needs authorized private-record access. A topic can span multiple classes. Code proves only the inspected behavior, not a public guarantee, regulatory compliance or authority to transmit records to a model.

## Audit of the existing deterministic guide

Every identifier in `lib/assistant/guidance.ts` / `lib/assistant/contracts.ts` is covered below. `lib/assistant/compose.ts` currently labels GUIDE source references as implementation/unavailable-policy guidance, composes deterministic drafts and does not retrieve bookings. COPILOT's scoped Support snapshots remain deterministic and are not sent to Qwen.

| Guide topic(s) | Class | Inspected source and boundary | M5A disposition |
| --- | --- | --- | --- |
| BORROWING |1,4 | `app/api/bookings/route.ts`, `app/api/bookings/[id]/route.ts`: pending request and owner-response transitions; actual eligibility/availability/acceptance requires the specific authorized record. | General request/acceptance distinction only, BOOKINGv1. |
| LISTING |1,4 | `app/listings/new/page.tsx`; owner/listing workflows exist, but the assistant cannot publish or infer actual listing eligibility. | Not retrieved in this pilot. |
| PICKUP |1,4 | `lib/rental-lifecycle.ts`: owner preparation, borrower receipt and protected meetup completion remain distinct. | General flow only, HANDOFFv1. |
| QR |1,4 | `lib/meetup/service.ts` and lifecycle receipt checks: verification is not independent proof of physical receipt/condition. | QR-alone limitation in HANDOFFv1. |
| MRT |1,4 | `lib/meetup/location.ts`: agreed station versus temporary TEST_LOCATION; no verified arrival from a textual report. | General agreed-station/test-location limitation in HANDOFFv1; no coordinates retrieved. |
| RETURN |1,2,4 | `lib/rental-lifecycle.ts`, `lib/inspection/service.ts`: submission, verified receipt, inspection/dispute are separate; production exceptions/cutover are not settled by code. | General distinction only, RETURNv1; no deadline promise. |
| EVIDENCE |1,4 | Lifecycle/photo records and `app/api/bookings/[id]/evidence/[photoId]/route.ts`: original participant-scoped records, later inspection provenance. | Preserve originals; no image retrieval or inspection, RETURNv1. |
| CONDITION |1,2,4 | `lib/condition-claims/service.ts`, `contracts.ts`: development participant claims/responses and immutable events, not production sanction policy. | Neutral reports versus findings, RETURNv1; no access to actual claims. |
| DAMAGED |3,4 | No approved operational Vision; `lib/item-documentation/vision-contract.ts` exposes unavailable state. Actual damage/causation needs authorized evidence/human review. | Explicit no-image-inspection limitation, RETURNv1. |
| RETURN_UNVERIFIED |1,4 | `lib/inspection/service.ts` derives authoritative physical return from actual receipt/challenge; a claim is not that event. | General distinction only; never mark a booking returned. |
| QR_FAILED |1,3,4 | Existing meetup controls govern camera/GPS/consent and any independently acknowledged fallback; individual failure/eligibility is unknown here. | No alternative/fallback authority; no troubleshooting bypass. |
| OWNER_ABSENT / BORROWER_ABSENT |2,3,4 | Original roadmap Stage12 has unfinished overdue/no-show work. Actual attendance/communications need scoped evidence. | No no-show consequences/penalties in authoritative grounding. |
| DEPOSIT / PAYMENT |2,3,4 | Canonical roadmap Stage13 leaves provider/funds/deposit/refund policies unresolved. Displayed prices do not prove payment. | No financial terms, obligations, refund promises or provider data. |
| CONTACT |1,2,3,4 | `lib/support/tickets.ts`, `channels.ts`, `lib/support-staff-candidate/service.ts`: owned-development intake/private channels and independently scoped staff workflow. Production staffing/delivery policy unapproved. | Recommend authorized human help without claiming staff availability, a submitted ticket or response guarantee. |
| TECHNICAL |1,3,4 | `lib/api-response.ts`, booking/rental errors: visible non-secret errors can guide explanation; exact state unqueried. | No arbitrary system repair or booking-state editor. |
| ACCOUNT |1,2,3,4 | `lib/auth.ts`, existing account/password pilot and recovery proposals: actual sign-in/session checks exist; production recovery/MFA policy is not resolved here. | No account/identity verification or secrets; no new grounded category. |

## Procedure catalogue selected for this development candidate

`lib/local-inference/knowledge.ts` contains only three static allowlisted entries. It performs no DB, filesystem retrieval, web requests, embeddings or private Support reads. Topic selection is a hint, not permission. Grounded manifest construction occurs in the existing guarded server endpoint; the browser supplies no trusted text, source IDs, versions, review status or classification.

| Topic | Stable base ID / versioned citation | References | Review/approval status | Limits |
| --- | --- | --- | --- | --- |
| BOOKING |HUSTLEN-PROC-BOOKING / HUSTLEN-PROC-BOOKING:v1 | Guide BORROWING and existing booking create/owner-response API | IMPLEMENTATION_REVIEWED_DEV_ONLY; owner approval PENDING | Request≠acceptance; proposed change≠agreement. No actual time/availability, cancellation/refund terms or booking amendment. |
| HANDOFF |HUSTLEN-PROC-HANDOFF / HUSTLEN-PROC-HANDOFF:v1 | Guide PICKUP/QR, rental lifecycle, meetup service | Same development-only review; owner approval PENDING | Owner/borrower steps and QR/receipt distinctions. No actual arrival/completion or bypass/fallback/no-show authority. |
| RETURN |HUSTLEN-PROC-RETURN / HUSTLEN-PROC-RETURN:v1 | Guide RETURN/EVIDENCE, rental lifecycle, inspection service, claim notification contracts | Same development-only review; owner approval PENDING | Submission/receipt/inspection distinctions, original evidence preservation. No actual return/condition/compensation or enforceable response timer. |

Descriptions and limitations have authored English/zh-TW variants. They are not translations from an external API or verified model translations. Source references are safe repository paths, displayed as provenance text rather than executable links. Version1 content fingerprints are pinned by unit tests; metadata includes the full contentDigest. Future content changes require review and an explicit versioned update, not silent rewriting of accepted source history.

General procedural CONTEXT may support a statement about the implemented general flow; it **cannot verify a user's case**, authorize production policy or turn an allegation into a finding. The timestamp is a fixed catalogue baseline, not a booking/return/notification event. User turns remain PARTICIPANT_CLAIM. Unverified assumptions and AI recommendations remain labelled separately.

## Excluded or uncertain policy

No source establishes cancellation charges, no-show penalties, refund rights/financial obligations, compensation, production response SLA or deadline exceptions. The24h inspection candidate logic in `lib/inspection/contracts.ts` is not loaded as a universal commercial/legal claim. The proposed48h borrower response clock lacks approved reliable qualifying delivery semantics; `lib/condition-claims/contracts.ts` returns realDeliveredAt null / responseDeadlineEnforceable false. Inspection/dispute must never reverse completed physical return.

Static topic lookup rejects REFUND/PAYMENT/PENALTY/NO_SHOW/SUPPORT_SLA and unknown names. A user can still ask about these in conversation: the model is instructed to acknowledge unavailable policy and clarify/escalate, not invent it. This refusal behavior needs genuine Qwen review; a selector rejection test does not prove semantic refusal in an otherwise valid answer.

## Owner decisions still needed

Review the exact bilingual procedural wording/limitations and whether these three summaries are suitable for wider customer display; assign future policy/content ownership, revision/deprecation rules and review cadence. Approve any later production procedural policy separately. Approve supported human-escalation availability/notification semantics before implying a working staffed route. Do not infer approval for refunds, deadlines, private-data/model processing, operational Vision or production activation from this catalogue's development review status.
