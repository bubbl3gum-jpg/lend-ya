# First Operations read-only cohort — decision register

24 October 2026 (Asia/Taipei). Updated by Batch 6C: the Operations exact-ID, four-field `listings.read` allocation is **APPROVED product policy** under authenticated and audited access. Runtime activation is not approved. Other decisions below remain **PENDING product-owner approval**; no real person, member, grant or credential is provisioned.

| Decision | Exact approval needed | Required evidence / blocker |
| --- | --- | --- |
| Canonical human authority | Named organization/person or provider authorized to verify humans, accepted evidence, freshness, retention and alias reconciliation procedure | Independently verified canonical StaffPerson and account association; aliases share one human identity and cannot supply separate reviewers. Fixture verification is insufficient. |
| Sponsor and reviewer | Named qualified sponsor and independent reviewer, eligibility/conflict rules and bootstrap quorum | Two distinct verified humans where independence is required; neither the applicant nor an alias can self-grant. If the small team cannot supply eligible actors, onboarding remains blocked; no emergency ADMIN conversion. |
| Role and scope | **APPROVED:** Operations `listings.read` for exactly granted listing IDs, only `id`, `status`, `category`, `adminRestricted`, under authenticated and audited access. **PENDING:** actual cohort/IDs, grant purpose, conflict handling and review responsibility | No wildcard/category/all-listings grant, private content/evidence, status edit or other capability. Existing ADMIN does not imply a new role. |
| Passkeys and recovery | Approved enrollment verification, assisted lost-last-factor procedure, qualified independent recovery reviewers, notifications, device coverage | Real UV WebAuthn proof and exact session incarnation. No TOTP fallback, password/email-only recovery, synthetic assurance or self-approved recovery. Voluntary legacy Admin pilot remains non-enforcing. |
| Lifetimes and revocation | Exact membership, grant, session, proof and authorization-version validity; renewal and offboarding deadlines | Explicit bounded dates, grant no longer than membership; fail-closed expiry; revocation increments persisted versions and invalidates bindings. No durations silently selected here. |
| Audit retention | Retention period, legal/privacy owner, evidence-access capability, backup/export integrity and notification policy | Typed immutable event retention and restricted inspection; no logs of raw credentials or private listing content. No silent deletion of history on rollback. |
| Origin/environment | Exact HTTPS RP ID and origin set, intended deployment account/region/environment and service ownership | No browser-origin selection, localhost production workaround or feature-flag-only activation. Separate identities/filesystem/DB roles proven per deployment boundary document. |

## Minimal controlled onboarding procedure after approvals

1. Record the approved register version, named independent reviewers and exact deployment/migration artifact hashes. Halt if any decision is unresolved.
2. Verify the applicant using the approved authority; reconcile existing accounts/aliases to one canonical person. Check marketplace-participant conflicts without granting staff access to private evidence.
3. Sponsor proposes a bounded Operations membership and one exact listing read grant; independent eligible reviewer verifies identity, purpose, dates and conflict exclusions. Record immutable attribution. No applicant self-grant or client-selected role/version.
4. Use the separately implemented trusted issuance service. Enroll a genuine passkey against approved origin and current account association; require UV assertion and a new server-derived session binding. Enrollment is not role activation.
5. Execute only the separately approved, recorded activation procedure through its constrained provisioning identity. Never set legacy ADMIN for Operations. Read authorization must recompute the complete real chain on each request.
6. Run the rollout checklist's positive/negative/audit/revocation tests, have the independent reviewer inspect typed evidence, then admit only the named cohort/scope. Keep legacy Admin routes inaccessible to these accounts.
7. On expiry, offboarding, lost factor or identity doubt: stop new bindings/reads, revoke memberships/grants and invalidate authorization/MFA/session versions as applicable; preserve audit and credential history. Use only the approved assisted recovery procedure.

Implementation of the issuer, provisioning workflow, recovery and activation remains outside Batch 6B. A two-person procedure written here is not an implemented approval engine or permission grant.
