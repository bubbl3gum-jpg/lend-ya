# Batch 13D-R2 — Rental Documentation Agreement Integration

29 October 2026, Asia/Taipei. Independent-review candidate; no production activation, push, merge or deployment.

## Revisions

- Branch: `feature/rental-documentation-agreement-batch-13d-r2`.
- Clean starting HEAD: `8528ac146a67bc22d24513fa6dab87fab4058c58` on `feature/durable-owner-studio-batch-13d-r1`.
- Supplied R1 implementation `c3bbfedf4209c1855d2a223a8381b84a132fbf83` and evidence `4e16630e8aafcd6187a3b86f6331438ccf1e9aee` are verified ancestors.
- Tested implementation: 847a947a5a0b1ab1fff546f2df4e673a7f2af920.
- Separate evidence closeout: 00d75e1192f27b4a507679a61e00692c4e6ffbb9 (this report is subsequently indexed with that exact commit).
- Final documentation index changes no implementation.

## Result

The actual borrower quotation/request and owner acceptance now support a separately gated owned-development documentation agreement. The owner explicitly designates a confirmed version; the borrower sees that exact condition/accessory/photo ledger and acknowledges it before the real request can be submitted. The existing Booking insert stores the immutable context and database-generated acknowledgement time atomically. Existing owner acceptance validates the same designation and records acceptance during PENDING→CONFIRMED. There is no parallel Booking authority, latest-version guess or independently mutable agreement copy.

A charger included in the reviewed version cannot silently become excluded. Changed designation blocks submission or pending owner acceptance; absent a supported amendment, cancel/reject and submit a newly reviewed request. Accepted references survive subsequent listing/title/condition/designation edits. Legacy bookings stay UNKNOWN with null new fields, and their actual acceptance remains valid under the original contract.

Listing declaration, agreed disclosure and physical pickup/return evidence remain separate. Acknowledgement is not a waiver or proof of physical condition. Fresh pickup remains the individual rental's physical-condition baseline. No original pickup/return evidence writer, custody transition, financial action or dispute submission is introduced.

## Verification outcome

All30 selected command groups passed at their final recorded runs, including144 unit tests, TypeScript/lint/Prisma validation, original MRT integration, rental API/browser, Support/13A,13B inspection,13C identity, R1 documentation, full genuine-camera meetup and normal production build. Both additive populated upgrade and historical migration preservation passed; final schema diff is empty. Initial failures and retries remain separately recorded. Read-only cleanup verification found zero residual R2 test databases or owned test principals.125 protected source files and all30 historical migrations are unchanged.

## Review materials

- [Pre-implementation authority audit](batch13d-r2/AUDIT_BEFORE_IMPLEMENTATION.md).
- [Source-backed gap analysis](batch13d-r2/GAP_ANALYSIS.md).
- [Model, security, lifecycle and owned setup contract](batch13d-r2/CONTRACT_AND_SETUP.md).
- [Complete changed-file inventory](batch13d-r2/CHANGED_FILES.md).
- [Actual selected regression ledger](batch13d-r2/VERIFICATION.md).
- [Screenshots and bilingual browser evidence](batch13d-r2/SCREENSHOTS.md).
- [Historical source and roadmap preservation](batch13d-r2/preservation.json).
- [Owned database/principal cleanup](batch13d-r2/cleanup.json).

## Migration and security

One additive transactional migration creates designation pointer/event and session-bound review-context tables, then adds nullable Booking fields. No historical migration or row backfill. Constraints enforce immutable history, exact revision/event association, unique context, no invented legacy timestamps and immutable documented Booking terms. Database-generated timestamps bind actual request/acceptance transitions. The populated R1 upgrade test also injects a partial SQL failure, verifies rollback, deploys normally and replays, comparing historical rows/checksums and unchanged sessions/roles.

Explicit development flag alone is insufficient: NODE_ENV, matching strict local disposable URLs, run ID, actual DB ownership marker, persisted actor/session, ownership/resource checks and exact Origin/custom-header CSRF controls are required. Production proxy and server gates refuse even configured flags. Prospective media is exact-context/session/version scoped; participants retain only their bound version through actual booking authorization. No private drafts, unrelated historic versions, original private rental evidence, identity documents or unrestricted media URLs become public. No Admin/Support bypass.

## Initial defects and reruns

Initial synthetic MRT fixture attempted to reuse an existing canonical station ID and failed a uniqueness constraint. Corrected fixture uses the existing seeded official station without changing the catalogue. A later browser run failed because a patch accidentally replaced the CSS file with TSX. Restored the exact baseline stylesheet plus scoped rules; no test timeout or collector change.

The first wider run exhausted disk due to accumulated generated test Next caches. Authorization observed a 500 instead of401 and the retained server trace explicitly reports ENOSPC/Turbopack write failure; later groups failed during database migration. Generated `*/next` caches were removed while screenshots, server logs and run records were retained, recovering19GB. Affected groups were rerun from newly owned databases; initial outcomes remain separately recorded. This is distinct from historical overlapping-login intermittence, which remains unresolved as a general engineering issue.

A later rental-browser run stopped at the second owner handoff heading. Its server trace shows no second acceptance PATCH and shows an HMR compilation plus a React pre-mount warning during the interval; source edits were still occurring. This observation is retained separately; the final source-frozen rerun passed all4 tests without test changes. It is not evidence of an authorization bypass or a resolved historical login issue.

The historical schema-diff check detected equivalent ten-minute default expressions represented differently by PostgreSQL and Prisma. Aligned the new Prisma field with PostgreSQL’s canonical default text; the new SQL migration and ten-minute enforcement are unchanged. No historical migration was modified.

## Scope and remaining blockers

All new agreement enforcement/sharing remains development-only. Never-designated legacy listings retain original behavior; explicitly withdrawn pilot designations remain blocking rather than silently reverting. Review expiry limits new submission, not access to already-bound participant records. Development history is retained until owned database cleanup; production retention/holds/deletion/ownership transfer and principals require independent review.

New ledger labels are English/Traditional Chinese; source text/category/area identifiers are not silently translated. Existing operational rental form/station workflow outside this slice remains English. Heritage ruled surfaces and existing preferences are reused; no broad redesign, new artwork, audio or motion. Screenshots/keyboard/viewport checks are engineering evidence, not full accessibility certification, physical-device acceptance or product-owner visual approval.

Production cutover for undocumented listings, user communication, legal/policy review, privacy/retention and independent security/product acceptance remain open. The13B-R1 structured claims, borrower responses and qualifying notification-delivery prerequisites remain unresolved. No real eKYC/biometrics, live AI/Vision/egress, automatic publication, payment/deposit decision, new staff authority or autonomous action. Canonical14 stages and unfinished Stage6–9 commitments are preserved; Stage10 remains In Progress. Await independent review; do not automatically start another batch.
