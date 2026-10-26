# Stage 8 product decision register — Batch 10A

Approved Blueprint: announcement management, routine versus high-impact authority separation, independent high-risk human approval, immutable audit; read-only effective settings inventory, future typed configuration. Candidate fixtures below do **not** approve production behavior. Every pending row needs a named accountable product/security/operations owner, dated rationale, version, scope and independent review before live enablement.

| Decision | Candidate behavior | Production status / required approval |
| --- | --- | --- |
| Audiences | One OWNED_TEST_ADMIN allowlist only | Pending public / logged-in / Owner / Borrower eligibility, minimization and overlap semantics |
| Authors / editors / publishers | Current ACTIVE legacy Admin + owned tester gate | Pending exact capability allocation, assignment/conflicts and separate publish authority; no auto SA promotion |
| Routine / high-impact | Informational fixture only; no emergency or safety-critical path | Pending taxonomy, content/audience/schedule binding and risk-escalation rules; signing in as ADMIN cannot downgrade risk |
| Independent approval | No live publishing or executor | Pending distinct verified humans, alias conflict, recent real MFA, expiry/version/revocation checks; author cannot approve own notice |
| Emergency notices | Unsupported | Pending narrowly defined templates, urgency, separate authorized reviewer and aftercare; a single operator remains blocked |
| Size / format | Title 120, body 4000; plain text | Pending final limits, accessibility, link handling, moderation and localized validation |
| Publication / scheduling | DRAFT → PUBLISHED, half-open persisted UTC window ≤31 days | Pending notice duration, scheduling authority, backdating, cancel/reschedule and approval invalidation |
| Withdrawal / corrections | PUBLISHED → ARCHIVED; published content immutable | Pending emergency withdrawal authority, reader communication and corrected-notice linkage |
| History / retention / deletion | Metadata + request hash immutable; no old content snapshots; whole owned DB discarded | Pending content revision retention, holds, redaction/deletion, evidence access and backup compatibility |
| Localization | One text body; Taiwan time display | Pending languages, translation review, fallback and revision/approval binding |
| Delivery | In-app test page only | Pending in-app placement vs email/SMS/push, subscription/consent, provider, outbox, retries and withdrawal limitations |
| Editable settings | None | Pending individual typed IDs, validated bounds, risk ownership, review and consistency migration; no arbitrary key-value endpoint |
| Production database / publisher principal | No rollout | Pending additive release path across owned-only inherited migrations, least-privilege publisher/audit principals, recovery and independent acceptance |

Staff authority, Support production availability and high-risk execution remain blocked independently. Existing decisions are preserved in `docs/admin/ADMIN_PERMISSION_MATRIX.md` and `docs/support/STAGE_7_PRODUCTION_DECISION_TRACKER_BATCH_9A.md`; this register does not amend those allocations.
