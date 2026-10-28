# HUSTLEN’
## AI Product & Trust System Blueprint

**Version:** 0.1 — Working Product Blueprint  
**Product:** Hustlen' — Peer-to-Peer Item Rental Marketplace  
**Initial market:** Taiwan  
**Languages:** English and Traditional Chinese  
**Purpose:** Define the user experience, intelligence capabilities, trust mechanisms and implementation roadmap before further engineering.

---

## 1. Product Vision

Hustlen' is a peer-to-peer marketplace that enables people to earn from belongings they own and access items they need without purchasing them outright.

Our AI strategy is not to create a generic chatbot.

**Our vision is to make the entire rental experience more intelligent, trustworthy, convenient and fair.**

AI should help users make informed decisions, document physical exchanges, prevent avoidable disputes and recover when circumstances change.

### Core Principles

1. **Trust before automation.** Verification and reliable records are more important than impressive AI output.
2. **Human-centered decisions.** AI assists people; it does not independently impose fines, assign blame or decide disputes.
3. **Evidence before conclusions.** Participant claims, application records and AI observations must remain distinguishable.
4. **Flexible but accountable.** Owners and borrowers can agree to reasonable changes without bypassing core safety requirements.
5. **AI when useful, conventional software when better.** Exact prices, status transitions, eligibility and permissions should be enforced through application rules.
6. **Privacy by design.** Identity documents, biometrics, location information and rental evidence receive purpose-specific protections.
7. **One coherent product.** AI appears naturally inside existing user journeys rather than requiring separate chatbot experiences.

---

## 2. The Hustlen' Intelligence System

The product will contain three specialized AI experiences, supported by shared trust and operational services.

| Experience | Primary purpose | Main interface |
|---|---|---|
| Customer Service AI | Explain, troubleshoot, coordinate recovery and assist human dispute resolution | Contextual help, Resolution Room, staff Case Dossier |
| Owner AI | Help owners list, document, prepare and manage rentable items | Hybrid Listing Studio |
| Borrower AI | Help users discover suitable items and make informed rental decisions | Search-first discovery with optional conversational assistance |

### Shared Systems

**Identity Assurance:** eKYC and event-based identity challenges.

**Vision Inspection:** Document quality, item condition and accessories.

**Meetup Assist:** Temporary location sharing, ETA and mutually agreed scheduling adjustments.

**Assisted Resolution:** Guided recovery proposals, mutual agreements and escalation to authorized Customer Service.

**Evidence & Audit:** Protected original records, source attribution and appropriate access controls.

These services share infrastructure where appropriate, but must not automatically share private data or permissions.

---

# PART A — TRUST & SAFETY

## 3. Electronic Identity Verification (eKYC)

### Agreed policy

Users may register, sign in, browse listings and explore the marketplace without completing identity verification.

**Before publishing an item listing or submitting a rental request, identity verification is mandatory.**

This eligibility requirement must be enforced by the server, not merely through a visual interface.

### Initial accepted documents

For the Taiwan launch, the proposed documents are:

- Taiwan National Identification Card (國民身分證).
- Taiwan Alien Resident Certificate (ARC / 外僑居留證), including supported resident document types.

Actual supported versions and authenticity checks depend on the chosen verification provider.

### Verification sequence

1. User begins identity verification.
2. User captures an accepted official document.
3. The system checks document readability and supported authenticity indicators.
4. User completes live facial capture and liveness checks.
5. The verification service assesses whether the live face matches the document portrait.
6. The application receives a verification result.
7. Uncertain or failed checks are handled through secure retry or manual review.

A document image passing automated checks is **not automatically equivalent to government database verification**.

### Public identity information

Other users may see a limited verification indicator, but never the person's raw ID card, ID number, residential address, selfie or biometric template.

### Future expansion

The verification architecture should support additional countries and document types through a controlled, country-specific configuration.

No unsupported document type should be labeled verified.

### Security and privacy

Actual biometric processing requires approved lawful processing, a reviewed provider, appropriate encryption and access controls, narrowly defined retention, deletion and incident procedures.

Raw identity materials must be isolated from ordinary marketplace AI and item-inspection services.

---

## 4. Event-Based Randomized Verification

### Agreed direction

Additional verification should happen at meaningful rental events, principally pickup and return.

There should be **no unexpected continuous facial surveillance during the rental period**.

### Face verification

When required by the approved verification policy, a participant may receive an additional live identity challenge during an active pickup or return session.

Challenges may vary, using an evaluated liveness process.

The aim is to reduce account impersonation and replay attempts.

The application should support accessible alternatives and controlled human-reviewed recovery when verification cannot be completed.

### Item verification

Each rental has a standard evidence checklist.

Some sessions may receive additional randomized capture requests, such as an extra view of a camera's ports or a close-up of a particular surface.

Randomized requests supplement mandatory evidence; they do not replace it.

Challenge selection, completion and exceptions should be auditable.

---

## 5. Vision AI — Hybrid Item Inspection

### Primary purpose

Vision AI should improve documentation quality, compare physical condition and assist with accessory verification.

It must not automatically declare liability or financial compensation.

### Checkpoint A — Listing baseline

Before publication, the owner provides:

- Basic item photographs.
- Declared condition.
- Known defects or visible wear.
- Declared included accessories.
- Owner confirmation of the listed information.

Vision AI may flag blurred photographs, unclear item identity, missing views or inconsistencies between descriptions and images.

This represents the **owner-declared advertised condition**, not the final condition at the start of every rental.

### Checkpoint B — Pickup baseline

Fresh comprehensive photographs/videos and the required handoff evidence are captured during pickup.

A category-specific checklist records relevant surfaces, included accessories and visible defects.

Both parties complete the applicable verification/acknowledgment steps.

These records become the primary condition baseline for that particular rental.

### Checkpoint C — Return inspection

Fresh return documentation is captured using corresponding views and accessory checks.

Vision AI may highlight:

- Possible new scratches.
- Potential dents or cracks.
- Visible differences.
- Missing or unclear views.
- Accessories not confirmed in the images.
- Areas requiring manual inspection.

It must distinguish **not visible**, **possibly changed**, **confirmed by a participant** and **verified application record**.

A missing object in a photograph does not necessarily establish that the accessory has been lost.

### Hybrid capture policy

- Clear essential evidence: continue.
- Unclear photograph: recommend immediate retake.
- Minor quality issue: continuation may be allowed with acknowledgment under an approved policy.
- Essential evidence unavailable: use a controlled, human-reviewed exception pathway.
- Potential damage: flag for owner inspection and possible dispute.
- Uncertain comparison: disclose uncertainty and request better evidence when feasible.

Original evidence must be preserved and protected against silent alteration.

---

# PART B — CUSTOMER SERVICE AI

## 6. Customer Service Mission

Customer Service AI is the highest-priority intelligence experience.

Its job is to prevent manageable problems from becoming serious disputes, help people agree on practical solutions and make complex cases easier for human staff to review.

There are three assistance levels:

**Level 1 — Guided self-service:** Explain and troubleshoot.

**Level 2 — Mutual recovery:** Help both parties propose and agree to an acceptable solution.

**Level 3 — Human escalation:** Organize evidence and assist authorized Customer Service staff.

## 7. Core Customer Service Scenarios

| Incident | Proposed assistance | Human or system boundary |
|---|---|---|
| Owner fails to arrive | Confirm available meetup status, suggest waiting or rescheduling, open shared coordination | No automatic blame or penalty |
| Borrower arrives late | Show consent-based ETA, enable discussion and a revised meeting proposal | Fees only under separately approved rules |
| QR verification fails | Guide retries and supported recovery | No AI override of custody verification |
| In-person exchange occurs without completed verification | Explain incomplete steps and request controlled recovery | No unverified automatic completion |
| Item appears damaged at return | Compare available evidence and highlight possible changes | Human review for contested liability |
| Accessories appear missing | Compare declared inventory and recorded evidence | Clarify before declaring loss |
| Wrong item delivered | Help compare agreed listing details with permitted evidence | Escalate unresolved identity/condition disputes |
| Parties disagree about a solution | Present documented alternatives and record responses | No binding AI decision |

These are design scenarios to validate, not reported real-world Hustlen' incidents.

## 8. Meetup Assist

When a confirmed pickup or return is approaching, each participant can voluntarily share temporary location information.

The application may display an ETA to the agreed meeting point.

### Requirements

- Location permission is explicit.
- Sharing is limited to the appropriate booking and meeting window.
- Users can stop sharing.
- ETA may be displayed without exposing continuous exact coordinates to the other participant.
- Updates expire automatically.
- Location data is not used as automatic proof of attendance.
- The system handles poor GPS, interrupted connectivity and unavailable route estimates.
- A route provider, such as Google Maps, requires separately approved credentials, billing and data-handling arrangements.

### Rescheduling

Either participant may propose an updated meeting time.

Both must explicitly accept the same proposal, and the application must verify that it is allowed under the current booking terms.

The original agreement and accepted amendments should remain auditable.

## 9. Resolution Room

A booking-specific shared coordination space for owners and borrowers when an exception occurs.

The room may support:

- Shared discussion.
- AI-suggested recovery alternatives.
- Proposed meeting changes.
- Explicit owner acceptance.
- Explicit borrower acceptance.
- Clear pending/rejected/accepted states.
- Escalation to human Support.

Private participant-to-Support conversations must remain separate and inaccessible to the opposing participant.

### Example: Owner delayed

AI may suggest waiting, proposing a new time or requesting human assistance.

A secure locker handoff is a future possibility only after the application supports the required access, custody, verification and liability controls.

The AI does not itself create a new booking, transfer custody or override evidence requirements.

## 10. Damage and Missing-Accessory Disputes

After the item is physically returned, the owner receives a defined inspection window.

During that window, the owner may raise a dispute concerning damage, missing accessories or condition discrepancies.

### Required behavior

1. Preserve the return event and evidence.
2. Present pickup-versus-return documentation.
3. Allow the owner to identify the specific disputed issue.
4. Allow the borrower an appropriate opportunity to respond.
5. Distinguish physical return from financial and inspection closure.
6. Hold contested commercial closure where the approved policy requires it.
7. Provide a documented human resolution pathway.

An unresolved dispute must not imply the borrower still physically possesses an item already recorded as returned.

**AI must not automatically deduct a deposit, determine repair costs or assign blame.**

Any future deposit claim must rely on applicable agreed terms, documented evidence and an appropriate review process.

The exact inspection deadline, disputed-funds handling and appeal rules remain open decisions.

## 11. Human Support Copilot

Authorized staff may receive an AI-assisted case dossier containing:

- Neutral case overview.
- Application-event timeline.
- Participant claims and source references.
- Possible inconsistencies.
- Missing or unreviewed evidence.
- Clarification questions.
- Human-reviewed bilingual reply drafts.

Only independently authorized, case-assigned staff may access the relevant private information.

The AI must not infer guilt, manufacture evidence, access unrestricted case records or send replies automatically.

---

# PART C — OWNER AI

## 12. Owner Mission

Help people convert belongings into accurate, well-documented rental listings and prepare them for safe handoffs.

### Agreed interaction: Hybrid Listing Studio

Owners can begin with either photographs or manually entered details.

Both paths converge into a single reviewable listing and documentation process.

### Core capabilities

**Photo assistance**

Suggest likely item categories and possible attributes, with explicit owner confirmation for uncertain details.

**Listing writing**

Prepare editable titles and descriptions from confirmed facts.

**Missing-information detection**

Identify absent specifications, unclear condition details and incomplete accessory declarations.

**Condition documentation**

Guide owners through basic listing photographs and later comprehensive pickup/return evidence.

**Rental preparation**

Explain the actual booking, MRT meetup, QR, evidence and return workflow.

**Communication drafting**

Prepare editable owner-to-borrower messages using only permitted context.

### Mandatory owner control

The owner chooses and confirms material listing facts, pricing, deposit, availability and publication.

No automatic listing publication, unreviewed factual claims or unauthorized message sending.

### Listing documentation policy — Agreed

**At publication:** Basic condition photographs and accessory declarations are required.

**At pickup and return:** Fresh, comprehensive evidence is required, subject to the controlled hybrid exception policy.

---

# PART D — BORROWER AI

## 13. Borrower Mission

Help users discover suitable items, understand their options and make informed rental decisions.

### Agreed interaction: Hybrid, search-first

The primary experience remains an ordinary marketplace search.

AI provides deeper assistance when a request is ambiguous, goal-oriented or requires comparison.

**Simple searches stay simple. Complex requests receive more assistance.**

### Core capabilities

**Natural-language discovery**

A borrower can search for an exact item or describe an activity, such as filming a tennis match.

**Goal interpretation**

The assistant identifies potentially relevant item categories and clarifying questions.

**Real listing results**

Results must originate from eligible existing listings and validated application searches.

**Smart comparison**

Compare confirmed listing prices, deposits, specifications, accessories, documented condition and eligible meetup information.

**Documentation awareness**

Explain what condition and accessory details are documented, missing or uncertain.

**Compatibility guidance**

Identify compatibility requirements and ask for missing specifications rather than guaranteeing compatibility.

**Rental planning**

Prepare proposed collections of items for events or activities, using verified listing data when available.

**Optional conversation**

Users may ask contextual questions without abandoning their search results.

**Booking guidance**

Explain eKYC requirements, booking steps, pickup arrangements and evidence procedures.

### Access control

Unverified users may browse and use permitted discovery assistance.

Submitting a rental request requires successful eKYC.

AI may not bypass eligibility, invent inventory, guarantee availability or autonomously create bookings.

---

# PART E — ARCHITECTURE & GOVERNANCE

## 14. AI Versus Application Rules

Use the appropriate technology for each responsibility.

| Responsibility | Primary mechanism |
|---|---|
| Account permissions | Server-side authorization |
| eKYC authenticity and liveness | Evaluated identity-verification technology |
| Booking lifecycle | Deterministic application state machine |
| GPS / ETA | Permission-based location and routing services |
| Item-image quality | Computer vision and capture rules |
| Condition comparison | Vision AI with human review |
| Listing descriptions | Language-model assistance or constrained templates |
| Search interpretation | Semantic retrieval and validated filters |
| Customer Service summaries | Source-grounded language assistance |
| Fines and deposit rules | Approved, deterministic financial rules |
| Binding dispute outcomes | Authorized human and application workflow |

AI recommendations must never be treated as authorization.

## 15. Evidence, Privacy and Provenance

Maintain clear separation between:

- Identity and biometric records.
- Public listing media.
- Private booking evidence.
- Shared Resolution Room messages.
- Private participant Support conversations.
- Restricted internal Support reviews.
- AI-generated observations and drafts.

Every AI-derived material claim should be attributable to a permitted source or clearly marked as an inference.

Use data minimization, protected storage, restricted access, appropriate retention/deletion rules and reliable audit records.

Identity images must not be repurposed for item inspection or public marketplace AI.

## 16. AI Provider and Deployment Policy

No live model provider has yet been approved.

Existing deterministic development demonstrations are not evidence of a functioning generative AI service.

Before real model inference, separately approve:

- Provider and specific model.
- Purpose and permitted data categories.
- Processing and retention terms.
- Credential and egress ownership.
- Request/token/spending constraints.
- Timeouts, concurrency and retry rules.
- Diagnostic retention.
- Stop conditions.
- Evaluation and privacy acceptance.

Biometric verification, vision processing and routing services require their own relevant reviews and approvals.

---

# PART F — IMPLEMENTATION STRATEGY

## 17. Current Technical Baseline

**Already reported as development candidates:**

- Existing rental/booking/QR/evidence workflows.
- Customer Service ticket and protected channel infrastructure.
- Stage 10 offline evaluation and review framework.
- Batch 13A deterministic Customer Service guide and assigned-case copilot.
- Stage 9 heritage visual design candidate.

These are not equivalent to full real-user production acceptance.

**Not yet delivered as agreed product capabilities:**

- Production eKYC.
- Event-based biometric challenge service.
- Approved real Vision AI.
- Temporary booking-level live ETA sharing.
- Fully implemented mutual Resolution Room.
- Automated damage/condition comparison.
- Owner AI Listing Studio.
- Borrower AI discovery assistant.
- Live approved generative AI.
- Production deposit deductions and lateness fee handling.

## 18. Recommended Engineering Order

### Phase 0 — Approve product contracts

Finalize this blueprint, resolve essential ambiguities and map requirements into the canonical fourteen-stage roadmap.

Preserve existing stage names and order.

### Phase 1 — Trust and evidence foundations

Specify eKYC policy, privacy and vendor requirements; item capture checklists; inspection windows; evidence preservation; and event-based verification.

Prototype safely using synthetic records and non-sensitive test material.

Real biometric processing needs separate authorization.

### Phase 2 — Customer Service experience

Build on Batch 13A.

Specify and implement the bounded Resolution Room, guided recovery plans, shared proposal acknowledgment and human escalation.

Keep any consequential application changes behind explicit authorization and future-stage approvals.

### Phase 3 — Owner Listing Studio

Implement hybrid photo/manual authoring, missing information, owner-reviewed drafts and documentation checklists.

Integrate with real listing permissions.

### Phase 4 — Borrower Smart Discovery

Implement search-first natural-language intent handling, eligible listing queries, comparisons and optional refinement.

Preserve existing booking and verification rules.

### Phase 5 — Unified integration and AI evaluations

Review the shared experience, cross-role privacy, localization, responsiveness, accessibility, visual identity, performance and actual model quality when an approved model becomes available.

### Phase 6 — Controlled operational capabilities

Only in the appropriate later stages, consider authorized booking amendments, broader recovery operations, payment/deposit processing and narrowly approved automation.

## 19. Roadmap Alignment

| Master roadmap stage | Blueprint responsibility |
|---|---|
| Stage 3 — Security Foundation | eKYC and verification security |
| Stage 4 — Admin Governance & Permissions | Restricted verification review and authorized staff actions |
| Stage 6 — Operations Management | Meetup/location operational dependencies |
| Stage 7 — Customer Service & Recovery | Resolution Room, exception handling, disputes |
| Stage 9 — Account Settings & User Experience | Verified-user journey and premium heritage UI |
| Stage 10 — AI Assistant, Stage 1 | Read-only guidance, vision observations, summaries and drafting |
| Stage 11 — AI Automation, Stage 2 | Future narrowly approved execution |
| Stage 12 — Marketplace Improvements | Search, evidence-capture UX, GPS coordination |
| Stage 13 — Payments & Deposits | Deposit claims and approved financial handling |
| Stage 14 — Pilot Readiness & Launch | Real-world verification, safety and release acceptance |

The original fourteen-stage roadmap remains authoritative.

Cross-stage dependencies are requirements, not permission to mark unfinished stages complete.

---

## 20. Product Acceptance Principles

Before treating a capability as ready for genuine users, verify that:

1. It solves a clearly defined rental problem.
2. It uses authorized and sufficiently reliable information.
3. The user can distinguish facts from suggestions.
4. Users retain appropriate control over consequential actions.
5. Failure and exception pathways exist.
6. Private information cannot leak across roles or cases.
7. Evidence cannot be silently altered or misrepresented.
8. English and Traditional Chinese behavior is appropriately validated.
9. Accessibility, mobile usability and performance are acceptable.
10. The feature's real costs, processing terms and operational risks are understood.

---

# OPEN PRODUCT DECISIONS

These points are not yet final requirements:

**D1 — Inspection deadline:** How long the owner has to raise a return-condition dispute.

**D2 — eKYC failure handling:** Acceptable retries, manual review requirements and provider selection.

**D3 — Random verification frequency:** Which pickup/return events require additional face or item challenges, and accessible fallback methods.

**D4 — Resolution Room authority:** Which mutually agreed proposals can become effective booking amendments, and under what conditions.

**D5 — Location sharing:** Exact visibility, timing, update frequency, provider and retention rules.

**D6 — Damage valuation:** Evidence requirements, repair estimates, disagreement handling and future deposit policies.

**D7 — Lateness policy:** Grace periods and whether any agreed monetary late fees should exist at all.

**D8 — Alternative handoff:** Whether approved lockers or other secure methods will be supported.

**D9 — AI providers:** Model selection, privacy terms, hard spend controls and release acceptance.

**D10 — Pilot scope:** Which item categories, users and scenarios will be included in the first controlled real-world trial.

These decisions should be resolved deliberately rather than invented during implementation.

---

## Final Product Statement

**Hustlen' uses intelligence to help people share physical belongings with confidence.**

Its AI should help owners document and prepare items, help borrowers discover what they need, and help both parties navigate imperfect real-world situations.

The marketplace's verified records, human agreements and application rules remain authoritative.

AI provides understanding, assistance and possible solutions—not unchecked authority.

**Design identity:** A premium vintage agricultural catalogue brought to life through thoughtful, tactile and intelligent experiences.

**Blueprint status:** Working draft, pending product-owner review and approval.