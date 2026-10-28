# AI Product & Trust Blueprint v0.1 — Phase 0 reconciliation

28 October 2026 · Asia/Taipei · documentation only, not an engineering activation batch.

The owner-supplied [working blueprint](AI_PRODUCT_TRUST_SYSTEM_BLUEPRINT_V0_1.md) is preserved verbatim. Its overall status is **working draft, pending product-owner review and approval**. Sections explicitly labelled agreed capture product direction; they do not establish existing implementation, provider approval, data-processing consent or release authorization. The [canonical fourteen-stage roadmap](../roadmap/MASTER_ROADMAP_14_STAGES.md) remains unchanged and authoritative. Blueprint phases and engineering batches do not replace or renumber its stages.

## Verified repository baseline

Clean `feature/customer-service-companion-batch-13a` HEAD `b9df4dc2fedff2ca8b43da3e21f940ef1ef11bd1`; implementation `02d36698ec4482f6eb676f985362447e8e8dff5d`, evidence `a4c66ebc65e08eeeb10aa5e18a059daf2e01b399`. This reconciliation is isolated on `docs/ai-product-trust-blueprint-v01`.

13A is an owned-development deterministic Customer Service guide and assigned-channel return-focused copilot, not live inference, semantic investigation, production Support or a Resolution Room. Owner/Borrower assistants and 13D integration are unimplemented. The normal build's inherited Google Fonts proxy blocker remains; prior test-only fallback compilation is not normal-build remediation. See [13A report](CUSTOMER_SERVICE_COMPANION_REVIEW_BATCH_13A.md).

## Direction versus verified capability

| Blueprint area | Current source/evidence | Gap and planning boundary |
| --- | --- | --- |
| Browse before eKYC, require eKYC before publish/request | `prisma/schema.prisma` User fields `identityVerified` and `verificationStatus`; `app/api/listings/route.ts`; `app/api/bookings/route.ts`; `lib/marketplace-permissions.ts` | Existing flags are not provider-backed identity/liveness proof. Inspected creation paths enforce authentication/account state but do not enforce the new eKYC policy. Do not claim mandatory eKYC is already implemented. Define trusted result provenance, expiry/revocation, transaction fences, existing-listing/booking treatment and accessible failure/review paths before a separately scoped implementation. |
| Identity documents, live face and event verification | Marketplace identity flags are separate from existing staff identity/passkey foundations | No approved marketplace eKYC provider or live biometric service. Staff MFA, a document upload or boolean is not marketplace eKYC. Separate lawful-processing/provider/security/retention decisions; no real identity capture or biometric processing now. |
| Hybrid listing documentation | `app/api/listings/route.ts`, `lib/listing-options.ts`, `lib/listing-media.ts` | Creation already requires photo-backed multipart input and declared condition. Category accessory fields exist but are collected when supplied; this is not a universally enforced complete accessory inventory. Owner confirmation, required inventory and listing-versus-rental condition baselines need explicit contracts and separate implementation. |
| Fresh pickup/return and inspection records | `lib/rental-lifecycle.ts`, `lib/rental-checklist.ts`, `lib/meetup/service.ts` | Existing protected lifecycle/evidence is reusable. No new random item/face challenge or hybrid exception is activated. Define essential evidence, minor-quality acknowledgments, exception authority and integrity before changing capture rules. |
| Vision quality/condition comparison | Existing protected listing/rental media and manual condition records | No approved real Vision AI or automated condition comparator delivered. Keep originals immutable; distinguish not visible, possible change, participant confirmation and application record. Never infer loss/liability from a missing view or reuse identity images for item processing. |
| Temporary ETA/location sharing | `lib/meetup/location.ts`, `lib/meetup/test-location.ts`; existing MRT/Test Lab contracts | Current geofence checks and isolated TEST_LOCATION demo are not live ETA sharing. Separate consent/window/revocation/precision/retention/routing contract required. Attendance verification and temporary sharing must remain distinct; no station catalogue changes. |
| Customer guidance and staff Case Dossier | `lib/assistant`, `lib/support-staff-candidate`, 13A report | Guide/drafts and scoped source timeline are candidates. Genuine semantic summaries, real-model quality, broader permitted evidence integration and production Support remain gated. Existing source-language disclosures and manual review remain. |
| Shared Resolution Room and mutual amendments | Existing private Support ticket/channel/assignment infrastructure; original roadmap Stage 7 | No shared room or binding amendment workflow implemented. A new shared audience must never expose private participant-to-Support or internal staff material. Define exact proposal/version/dual acceptance/expiry/conflict/concurrency/audit rules and approved effects before implementation. |
| Return disputes versus possession/financial closure | `lib/rental-lifecycle.ts`; `app/api/bookings/[id]/dispute/route.ts`; Booking receipt/evidence fields | Reuse actual receipt and inspection history. Audit how current DISPUTED status relates to physical custody rather than infer possession from a single status. Inspection deadlines, funds holds and appeal rules are unresolved; no new deadline, sanction, payment or closure rule adopted. |
| Owner Hybrid Listing Studio | Existing owner listing form/category data; programme 13B remains unimplemented | New design direction is hybrid photo/manual authoring, not a standalone generic chatbot. Photo inference requires separate approved processing. Constrained manual drafts can be scoped later; owner confirms facts/pricing/availability/publication. |
| Borrower search-first assistance | Existing eligible listing search/public details; programme 13C remains unimplemented | Preserve ordinary search and actual listing eligibility. Comparison and intent assistance need exact safe field/query contracts; unknown availability/compatibility must stay unknown. Do not advertise eKYC as already enforced. |

This is a focused source-backed reconciliation, not an exhaustive security audit or a new test certification. No live provider, media analysis, route estimate or actual customer incident is inferred from these sources.

## Decisions still required

The blueprint's D1–D10 remain open; no values, approvers, approval dates or vendor defaults are manufactured.

| Decision | Required product outcome | Dependency before engineering activation |
| --- | --- | --- |
| D1 Inspection deadline | Exact window, start event, clock/timezone, exceptions, dispute/appeal interactions | Stage 7/13 contracts; physical return must remain distinct from disputed commercial closure |
| D2 eKYC failures/provider | Supported Taiwan ID/ARC versions, authenticity/liveness, retries, manual review, accessible alternatives | Stages 3/4/9/14; provider, lawful processing, isolated storage, provenance, revocation and incident ownership |
| D3 Random verification | Trigger events/frequency, evaluated challenges, alternatives and exception authority | Stages 3/6/12/14; no continuous facial surveillance, no weakening mandatory evidence |
| D4 Resolution authority | Which proposals merely coordinate and which can amend a booking; exact independently enforced constraints | Stages 6/7; same-version bilateral acceptance is not universal authority or a custody override |
| D5 Location sharing | Visibility/precision, meeting window, TTL/update rate, stop behavior, routing provider and retention | Stages 6/12; separate routing credentials/billing/privacy, never proof of attendance |
| D6 Damage valuation | Evidence, repair estimates, counter-response, review, appeal and deposit rules | Stages 7/13; no automatic blame, valuation or deduction |
| D7 Lateness | Whether fees exist, grace periods, terms, exceptions and authorization | Stages 7/12/13; no invented penalties or retrospective fees |
| D8 Alternative handoff | Whether lockers are supported; access, custody, identity, receipt and liability controls | Stages 6/7/14; no unverified automatic completion |
| D9 AI providers | Exact provider/model/data purposes/terms/owners/limits/retention/stops/evaluation | Stage 10's ten-decision checkpoint still applies; separate biometric, vision and routing approvals as relevant |
| D10 Pilot | Exact users, categories, locations/scenarios, accessibility and supervised acceptance | Stage 14 and unfinished Stage 6–9 gates; development test success is not real-user acceptance |

Additional Phase 0 clarifications: how existing users/listings/rentals transition to eKYC eligibility without losing return/inspection/Support obligations; whether verification expires or is revoked; what the public badge attests; how duplicate identities and manual review are controlled; accessory inventory schema and acknowledgment; exactly which records enter a shared room; independent human decision and audit ownership. None is silently inferred from “agreed” headings.

## Cross-stage mapping and proposed next deliverable

- **Stages 3/4/9/14:** identity assurance, restricted review and eligibility/user journeys, operational acceptance.
- **Stages 6/12:** consented meetup coordination, scheduling and capture/search UX, preserving existing GPS/QR/custody rules.
- **Stage 7:** shared coordination versus private Support, recovery proposals, dispute/inspection/escalation and human governance.
- **Stage 10:** source-grounded read-only assistance, drafts and separately approved advisory vision; no autonomous authority.
- **Stage 11:** remains deferred/prohibited without narrow separate execution authorization.
- **Stage 13:** financial policies/providers/claims before any deposit or fee implementation.

Recommended next work is **Phase 0 product-contract review**, replacing an automatic jump to 13B: confirm this working blueprint's status, resolve the minimum decisions needed for the next bounded slice, and prepare an explicit trust/evidence and Resolution Room contract before code. Keep harmless draft/search improvements separable from biometric, custody, financial and authorization changes. Do not activate all cross-stage dependencies as one engineering batch.

No runtime/source-feature code, schema/migration, canonical roadmap, prior human-score file, database, permission, production configuration, provider, credentials, inference, payment, push, merge or deployment changes accompany this document. Provisional supervised-review judgments remain unsaved; this blueprint is not model-experiment approval.
