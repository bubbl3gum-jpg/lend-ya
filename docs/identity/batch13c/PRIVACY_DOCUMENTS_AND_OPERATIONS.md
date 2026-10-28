# Privacy, document compatibility, human review and expansion

These are design requirements/open decisions, not legal advice, vendor approval or production processing authority. Batch 13C collects no real documents, IDs, selfies, biometric templates or provider credentials. Synthetic fixtures and existing ordinary test accounts only.

## Minimal future data and lifecycle

Explain the purpose (identity assurance for new marketplace participation), information processed, provider/controller/processor roles, retention, recipients, cross-border transfers, rights and accessible alternatives **before** capture. Establish appropriate lawful basis and separately review any biometric consent; do not use a generic login checkbox as authorization. No eKYC for routine browsing, continuous surveillance, unrelated advertising or general AI training.

Prefer provider-hosted capture and encrypted transport, tightly scoped short-lived capture tokens, signed single-use callback correlation, no content in URLs/analytics/logs, no persistent app/browser document cache and a minimal authoritative result. Provider-hosted is a proposal, not selected infrastructure. Never label OCR as authenticity or government-database verification. Government records access requires separate actually authorized integration.

Future minimal application result: exact user/attempt/policy/document-support reference, provider's opaque reference, verified assertion metadata, assurance component outcomes, timestamps, expiry/invalidation and immutable minimal event reference. Exclude ID numbers, full document images, face images/templates and unrestricted provider payloads by default. Even opaque references/outcomes are sensitive: encrypt at rest as appropriate, least-privilege principals, exact account-scoped reads, no public badges disclosing document type/details, no raw verification data in Support/AI/item-evidence stores. Whether/how a public trust indication is permitted requires separate approval.

Retention is **unresolved**, not infinite by default: define attempt/result/attestation/event/provider-media durations, legal holds, deletion verification and backup expiry. Provider contract must cover subprocessors, location/transfers, retention/deletion, no training/secondary use, security assurance, breach response and audit evidence. No real data may be sent before provider/legal/financial/operational approval.

Expiry/revocation needs authoritative events, policy versions and consistency with future new-activity checks. A revoked identity must not erase original rentals, evidence, immutable decisions or ongoing return/Support obligations. Recovery must not silently reassociate identities or permit password/email-only replacement of a verified identity. Investigate compromised accounts with scoped human controls, notification and independently reviewed re-verification. No such recovery is implemented here.

Incident plan must identify owners, revoke provider/API credentials and sessions where appropriate, stop new verification/participation safely without impairing existing obligations, preserve restricted forensic evidence and follow approved user/regulator/provider notification/deletion processes. There is no approved incident owner or delivery channel invented by this candidate.

## Taiwan document compatibility

Initial **intended** document registry is TW + TW_NATIONAL_ID and TW_ARC. Neither is declared operationally supported. Before activation evaluate exact current/older card variants, document versions, front/back requirements, authenticity/security features, expiry/validity rules, capture quality, local names/scripts, face availability and accessibility. ARC variants and any unsupported cases need explicit provider evidence and appeal path. Do not collect actual examples in this repository.

Required provider capabilities are distinct: document authenticity; live liveness/anti-replay; face-to-document match. OCR extraction alone does not satisfy any combined verified eligibility claim. Measure false acceptance/rejection, spoof/document attacks and appropriate Taiwan population/language/accessibility performance through separately authorized privacy-safe evaluation. No reliability or demographic fairness result is established in this batch.

## International expansion architecture

A future server-owned, versioned document-support registry must distinguish jurisdiction, document class/version, evaluated provider capability, required assurance level, expiry/reverification rules, effective dates and rollout state. Lookup is exact; unknown country/type/version fails closed for **new verification**, without blocking sign-in/browse/ongoing obligations. Add countries only through separately approved registry revisions and evidence; no wildcard country or client-chosen policy/provider. The 13C runtime script accepts only the two intended Taiwan enum values; it does not activate any document/country.

## Retry, review, appeal and accessibility

| Situation | Proposed response | Authority / limitation |
| --- | --- | --- |
| Poor document capture | Specific retake guidance without accusing fraud; bounded retries | Actual capture/quality provider and thresholds unapproved |
| Failed/unavailable liveness | Guidance, accessible alternative, supervised review where independently approved | No camera/biometric capture in this prototype |
| Unestablished face match | Express uncertainty; no fraud/guilt label | Do not let self-assertion or generic staff click grant VERIFIED |
| Unsupported variant | Explain incompatibility; route to restricted compatibility review | No fabricated support or lockout of browsing |
| Manual review | Minimal redacted case, narrow verification-review capability, auditable evidence access and decision/independence rules | No general ADMIN/Support raw-ID access; no staff provisioning or review screen |
| Accessibility difficulty | Clear assistance route, equivalent validated method, language support, accessible timing/retry and privacy | This page links actual Customer Service; creates no case, exception or verification |
| Fraud suspicion | Restricted trained investigation, evidence preservation and appeal | Failed automated check alone is not fraud; no sanctions issued |
| Correction/appeal | Trusted identity re-review with traceable versioned outcome | Production workflow, owners and deadlines unresolved |

English and natural Taiwan Traditional Chinese describe the candidate using existing locale context/cookie, exact en/zh-TW IDs and heritage shell. Fixed event/action/purpose codes may remain visibly technical English identifiers in history; no submitted credentials or personal data are translated. No decorative motion/audio, new fonts, images or asset licences introduced. This is not new Stage 9 aesthetic acceptance or a full-site localization claim.

## Production decision register — all unresolved

Exact provider/service ownership and SDK/endpoint; document versions/capability tests; lawful basis/biometric and cross-border terms; retention/deletion/holds; assurance/expiry/invalidation; callback and signing/key operations; restricted manual reviewers/independence; accessibility alternatives/appeals; costs/billing/limits and incident ownership; duplicate-identity/recovery/reassociation; notification; transactional publication/request cutover and migration/grandfathering; randomized event-challenge policy. Synthetic fixtures are not approvals. No staff roles, production verification, new listing/rental restrictions or live AI follows.

## Preserved 13B blockers

Durable immutable structured claims, persisted borrower responses, reliable qualifying notification, enforceable 48h deadline, approved extensions/exceptions/appeals, financial deductions/settlement and production dispute cutover **remain blocked**. The agreed 24h owner inspection and 48h borrower response durations remain unchanged in the canonical product blueprint. This batch does not solve or activate any of these dependencies.
