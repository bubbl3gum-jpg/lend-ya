# Next steps roadmap

Owner decision for this handover: **restore rental acceptance first**. The ordering below is a recommendation until each implementation or rollout is authorized. Use canonical main as the starting point and consult the corresponding branch before rebuilding an existing candidate.

## Critical blockers

| Priority | Work and source | Dependency / complexity | Acceptance criteria |
|---|---|---|---|
| P1 | Restore cloud Prisma engine access and reproduce canonical baseline. [Prisma config](../../prisma7.config.ts), [owned runner](../../tests/run-isolated.ts) | Environment allowance. Small configuration change and medium rerun effort. | Pinned engine verifies, client generates, type and unit checks pass, fresh and historical isolated DB migrations and isolated production build complete with cleanup. |
| P1 | Restore rental browser acceptance after the Mission 5 guard. [Mission 5](../audits/operation-new-features/MISSION_5_HYDRATION_ROOT_CAUSE.md) | Successful baseline and managed browser. High. | Matching positive and negative controls, cold listing page and navigation verified, no captured hydration errors, content updates continue to work. Compare bundler cohorts and retain structured diagnostics. |
| P1 | Close onsite rental operations acceptance. [Meetup service](../../lib/meetup/service.ts), `87459cbc`, browser acceptance workflow | Stable software path, owner-approved physical device test. High. | Both devices complete the request through verified pickup, return, and review or dispute. Test failed geofence, camera permissions, lost-response replay, revocation, and retain explicit owner sign-off. |

## Functional gaps

| Priority | Work and source | Dependency / complexity | Acceptance criteria |
|---|---|---|---|
| P2 | Complete recovery Step 3 on `integration/account-recovery-milestones-1-2`. [Branch audit](BRANCH_AUDIT.md) | Rental gate restored. Simulated delivery and runner-owned database. Medium. | Step 3 test file exists and runs desktop/mobile acceptance, including generic request responses, expiry, one-time use, session revocation, retry and delivery-disabled refusal. Preserve legacy auth behavior. Obtain merge and rollout approval separately. |
| P2 | Define production Support and notification requirements. [Support](../../lib/support), [condition claims](../../lib/condition-claims) | Owner decision on channel assignment and what constitutes delivered notice. High. | Exercise assignment, authorized requester/staff replies, removal and audit scope. Show delivery evidence before enforcing any response timer. |
| P2 | Decide whether deposit amounts stay informational or require payment execution. [Booking policy](../../lib/booking-policy.ts) | Owner decision and any applicable financial requirements. High if processor integration is adopted. | Document who authorizes payment, what triggers changes to charges and deposits, and how retries and reconciliation work before enabling value movement. |

## Security and reliability improvements

| Priority | Work and source | Dependency / complexity | Acceptance criteria |
|---|---|---|---|
| P1 | Review Next and CI-tool advisories. [Security audit](SECURITY_AND_QUALITY_AUDIT.md) | Locked baseline and candidate patch validation. Medium. | Registry findings reviewed, supported fixes selected and pinned, compatibility and rental gates rerun. |
| P1 conditional | Validate deployment media/storage durability and legacy visibility. [Listing storage](../../lib/listing-media.ts) | Confirm production topology and current storage. High for multi-instance. | Rights-scoped reads preserved after restart and across instances, failures do not orphan private content, and test backup/restore covers metadata and bytes. |
| P2 | Verify request origin and staff access boundaries. [Auth](../../lib/auth.ts), [authorization](../../lib/authorization), [Admin](../../lib/admin) | Intended reverse proxy, roles, approval scope. Medium–high. | Route-by-actor permissions, revocation and audit evidence are exercised across core APIs and multipart paths. |
| P2 | Resolve data provenance and readiness telemetry. `f8c602c`, [operational errors](../../lib/operational-error.ts) | Owned historical fixtures and operations context. Medium. | Audit known-origin timestamps and preserve uncertain data. Diagnose bounded subprocess and RSC startup failures. Define redacted logs and readiness checks for the intended topology. |

## UX and product improvements

| Priority | Work and source | Dependency / complexity | Acceptance criteria |
|---|---|---|---|
| P2 | Complete real-device MRT/camera accessibility and failure UX. [Camera](../../lib/qr-camera-reader.ts), [meetup](../../lib/meetup) | Onsite plan, device access, core acceptance. Medium–high. | Permission denial, stream lifecycle, fallback limits and retry instructions work on target phones. |
| P3 | Extend localized operational surfaces and review visual approval. [Locale catalogs](../../lib/i18n), [agent rollout guidance](../../AGENTS.md) | Owner scope and translation review. Medium. | Agreed screens are bilingual without changing raw filter/data values or rental semantics. Confirm keyboard, touch, contrast and hydration. |

## Future features

| Priority | Work and source | Dependency / complexity | Acceptance criteria |
|---|---|---|---|
| P3 | Review durable studio, condition and recovery workflow activation. [Studio](../../lib/item-studio), [condition claims](../../lib/condition-claims), [recovery](../../lib/recovery-room) | Owner policy for evidence, notification and rollout. High. | Participant and evidence boundaries preserve provenance, legacy cases work, and proposal acceptance never mutates financial/custody state implicitly. |
| P3 | Evaluate AI advisory usefulness and independent identity integrations. [Local inference](../../lib/local-inference), [Vision](../../lib/vision-prototype), [identity](../../lib/identity) | Approved scope, data boundaries, review rubric, cost and real-world governance. High. | Real accepted evaluation evidence for the approved scope, durable human review where required, explicit refusals preserved and vendor activation separately approved. |

For precise historical branch evidence see [Branch audit](BRANCH_AUDIT.md). For current test results and risk reasoning see [Security and quality](SECURITY_AND_QUALITY_AUDIT.md).
