# Account-security decisions requiring explicit approval

All entries below are **proposals / pending production approval**. Passing owned synthetic fixtures approves no production policy. Owner roles indicate needed reviewers, not provisioned staff.

| ID | Decision-ready proposal | Decision owners / release gate |
| --- | --- | --- |
| AS-01 | Retain existing scrypt; decide production minimum/maximum, breached-password checks and Unicode byte semantics. Candidate uses 8–128 raw JS units, no trimming and rejects effective reuse. | Product + security; approve exact validation/migration compatibility before release. |
| AS-02 | Allow ordinary suspended users to secure their own credentials without changing custody/support obligations; no account restoration. | Product/safety + security; define all eligible states and abuse/obligation handling. |
| AS-03 | Exclude ADMIN, associated staff and ChatReviewer until separate verified MFA/assisted procedures exist. No ADMIN flag or membership promotion. | Security + authorized human governance owners; recovery/independence policy first. |
| AS-04 | Revoke all sessions including current; require fresh login; do not manufacture/pass through MFA assurance. Decide commit-boundary cutoff for already-authorized mutations separately. | Security + custody/Support owners; race acceptance and exact privileged-assurance policy. |
| AS-05 | Keep minimal immutable PASSWORD_CHANGED metadata only; approve readers, retention, legal holds, export, erasure and actor-FK deletion consequences. | Privacy + security + operations; no raw secrets/request bodies. |
| AS-06 | Candidate 5 attempts/15 minutes per user, persistent cap6 and fail closed on unavailable counter/audit/revocation. Define ingress/IP controls and incident response before release. | Security + infrastructure; measured capacity/DoS review. |
| AS-07 | Out-of-band notification requires approved channel/provider, verified destination, queue/retry/deduplication, content minimization and delivery monitoring. No delivery currently implemented. | Product + privacy + operations; named delivery ownership and failure policy. |
| AS-08 | Separate assisted recovery: independently verify identity, define authorized reviewers and distinct humans, revoke credentials/sessions, audit/notify, narrowly bounded emergency procedure. No password-only/email-only/self-approved recovery. | Product + security; signed recovery specification before tokens or reset implementation. |
| AS-09 | Approve scoped en/zh-TW account copy and visual identity; retain passwords/data unmodified and current user preferences. | Product + Taiwan-language reviewer; explicit visual acceptance, physical Safari/iPhone, screen-reader and zoom checks. |
| AS-10 | Approve production least-privilege runtime grants, atomic event/revocation requirements, database-failure response and rollout/rollback monitoring. | Security + database/infrastructure owners; independent source review and owned rehearsal. |

## Recovery delivery proposal (not implementation)

The existing non-delivering recovery stub must not be presented as a functioning reset service. A future design must specify destination verification, cryptographically random single-use hashed tokens, bounded expiry and attempt limits, enumeration-resistant responses, exact-origin links, replay/concurrency handling, credential/session atomicity, recovery escalation for privileged accounts and independent human identity checks where required. Approve provider/data processing, delivery failure monitoring and support ownership before writing a reset/email flow. No token, email, notification, recovery privilege or mandatory MFA is added in 11F.
