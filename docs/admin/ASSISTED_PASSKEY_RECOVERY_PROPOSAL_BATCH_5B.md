# Assisted passkey recovery — Batch 5B proposal

24 October 2026 (Asia/Taipei). **Proposed policy; not approved enforcement or implemented recovery.** Passkeys remain optional for legacy Admin. The pilot has no recovery action or reset endpoint. Password-only, email-only and self-approved recovery remain forbidden. New staff memberships and approval execution remain inactive.

## Lost last passkey

The affected person opens a private, documented recovery case through an approved support channel. Support records a minimal incident reference and investigates; it does not change keys, grant Admin, reset MFA or approve its own recommendation. An existing marketplace session, password, email access or account name is insufficient identity proof. A remaining enrolled key plus fresh signed assurance can add another key through the pilot's existing authenticated controls; loss of every key requires the separate process below.

Require independent identity re-verification by an explicitly approved human identity-proofing authority. The product owner must define acceptable evidence, reviewer qualification, retention, access auditing, notification channels, waiting periods and escalation. Do not invent a government-ID collection workflow or identity-verifier authority in application code. Reconcile all known account associations to the same canonical StaffPerson; two accounts or aliases never establish two independent humans.

## Proposed responsibilities and separation

| Actor | Proposed responsibility | Explicit limitation |
| --- | --- | --- |
| Support investigator | Privately document incident, account associations, suspected compromise, custody/support obligations and a recovery recommendation | Cannot approve or perform the recommended reset. |
| Authorized identity reviewer | Independently verify the canonical human, inspect narrowly scoped proof with access audit, record a reasoned finding | Cannot be the claimant, their alias, the investigator or a conflicted participant. No unrestricted evidence browsing. |
| Separate authorized recovery approver | Review the exact case, identity finding, affected accounts/keys/sessions, risk and intended invalidation/enrollment plan | Distinct verified human; no self-approval or account-count shortcut. Role/capability allocation requires explicit approval. |
| Narrowly authorized executor | Apply only the reviewed exact recovery intent after final case/version/scope/conflict revalidation; issue an atomic immutable audit receipt | No generic SQL/status editor, ADMIN fallback, arbitrary key insertion or execution from this proposal. |

These are proposed task assignments, not newly active roles or grants. The exact number of required people and whether an executor may also be an independent approver require product/security review. Investigation and high-risk approval must remain distinct. If a small team cannot provide independent authorized reviewers, recovery waits or uses an explicitly approved independent external reviewer; it does not silently collapse separation of duties.

## Future controlled execution requirements

Before enabling recovery, design and review an atomic, bounded recovery transaction that revokes affected old credentials, invalidates factor and persisted authorization versions, invalidates existing administrative assurance/bindings and all affected account sessions, and records exact reasons, independent-human decisions and outcomes. Account aliases must be included. Review session revocation against rental, return, inspection and private-support access: restoration of ordinary marketplace authentication must preserve legitimate obligations without restoring staff privileges.

A recovery enrollment must be a new, short-lived, single-use, server-bound authorization for the exact verified person/account/session and approved case. It must not be a reusable recovery bearer token or a password/email reset. The actual replacement key must complete native WebAuthn enrollment and a signed assertion with required user verification. Old credentials/history remain terminally revoked. New assurance must not reuse an old authorization epoch or automatically activate a staff membership.

Notify previously verified contact channels when recovery is requested, independently approved, executed or rejected, and when replacement enrollment completes. Channels and notification timing are product decisions; changing a contact address must not also establish recovery identity. Avoid tokens, credential proofs and sensitive identity evidence in email, logs or general audit payloads. Preserve private proof under a separately approved retention/access policy; record bounded references and evidence-access decisions in immutable audit.

Failures must leave no partial authority: audit failure rolls back provisional invalidation/enrollment effects where transactional; notifications use a reviewed durable delivery design. Define handling for ambiguous commits, reviewer conflicts, expired approvals, compromised notification channels and revoked staff. Test these cases before connecting any recovery executor to a live operation.

## Emergency access

No password bypass, emailed code, fallback TOTP, hidden break-glass account, emergency ADMIN flag or owner SQL recovery recipe is authorized. A claimed emergency does not turn two accounts into independent humans or override booking/evidence protections. Define a separately approved, tightly scoped human-controlled emergency procedure, credentials/custody requirements, time limits, notifications and independent after-action review before mandatory MFA. Do not use the still-blocked Batch 4 executor as an emergency shortcut.

Mandatory enforcement cannot proceed until the recovery process, canonical identity authority, reviewer capacity, audited executor, notification delivery, retention, emergency policy and staged rollout have been independently approved and rehearsed.
