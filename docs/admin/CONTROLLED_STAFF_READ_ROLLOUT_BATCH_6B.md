# Controlled real staff read rollout — future gated checklist

24 October 2026 (Asia/Taipei). **NOT READY / NOT AUTHORIZED TO EXECUTE.** This is a deployment/test plan, not a production run command. No activation migration, production issuer or approved onboarding policy currently exists.

## Gate 0: exact migration and policy identity

| Required artifact | Current reviewed state |
| --- | --- |
| Exact forward activation migration path | **MISSING — no reviewed activation migration exists** |
| Migration git commit and SQL SHA-256 | **MISSING — cannot identify a nonexistent approved artifact** |
| Independent schema/security approval | **MISSING** |
| Approved real policy version/hash and issuer build digest | **MISSING** |
| Completed product decision register | **PENDING**, see [onboarding](FIRST_OPERATIONS_ONBOARDING_BATCH_6B.md) |

This directly blocks the requested eventual ACTIVE rollout. Do not treat the Batch 6A/6B commit or any historical foundation migration as an approved activation migration. Do not execute owner SQL to remove checks. A later separate batch must supply an exact new forward-only migration path, git SHA, SQL checksum, signed review record and tested policy/issuer artifact. Record them here before any release approval.

The future migration specification must retain historical migrations and legacy UserRole/AuthSession/ChatReviewer/audit/evidence records, preserve canonical-human uniqueness, one active role per person, alias/conflict exclusion, bounded grants, positive monotonic versions, append-only provenance and constrained provisioning. It must narrow activation to the approved Operations exact-resource read and real attributable read audit. Review explicitly how `staff_membership_inactive_only`, `staff_grant_inactive_only`, `staff_pending_binding_bounds`, the PENDING-only binding model and `staff_no_live_success` change without admitting DRAFT/PENDING/shadow/test authority. The existing `hustlen-admin-shadow-v1` contract cannot silently become an active policy. Preserve `staff_change_inactive` and `staff_decision_inactive`: no APPROVE, APPROVED or EXECUTED approvals, executor, generic role activation or mutation access is authorized by this read rollout.

## Ordered release and acceptance gates

- [ ] **Policy:** product owner approves every register decision and actual listing projection/classification. Independent reviewers and bootstrap capacity exist. If not, stop without aliases or self-approval exceptions.
- [ ] **Infrastructure:** prove separate service/process/filesystem/secret/DB identities and restricted authenticated IPC using the [deployment boundary](STAFF_DEPLOYMENT_BOUNDARY_BATCH_6B.md). Show denied hostile-runtime access and old-credential/session revocation. A shared-UID development process is insufficient.
- [ ] **Real issuer:** independently reviewed server resolves actual current login session and birth → verified canonical human/account association → eligible ACTIVE bounded Operations membership → persisted auth/policy versions → real fresh UV proof/key/MFA epoch → exact resource grant. Browser supplies no trusted person/role/risk/scope/assurance fields. DRAFT, PENDING, synthetic fixture policy/schema and TEST_* successes are categorical denials. Prove same-session-ID/different-birth rejection.
- [ ] **Migration rehearsal:** on newly created owned disposable DBs, test full historical replay and populated upgrade with representative users, sessions, bookings, reviewers and immutable evidence. Exercise transaction/partial-failure recovery, repeat application, revoked/expired/duplicate human membership attempts, owner/runtime privilege attacks and old-client compatibility. Save hashes/counts/trigger constraints. No reset or downgrade of an existing DB.
- [ ] **Route separation:** deploy a separately reviewed real read route and minimal DTO; never enable `/api/dev/staff-listing-read` in production. Existing legacy Admin guards stay unchanged; Operations USER accounts cannot call broad Admin helpers/endpoints. Production and disabled development pilot still return 404. No `ADMIN OR staffRole` fallback.
- [ ] **Exact grant:** constrained provisioning uses approved sponsor/reviewer and bounded explicit listing IDs/purpose. No wildcard, bulk/count selectors, participant-owned/alias-owned Listing or broad private evidence access. No automatic ADMIN conversion.
- [ ] **Final read transaction:** validate current authority with locks, exact grant before resource selection, fixed four-field projection, typed append-only audit, final expiry/version checks and durable commit before buffering/releasing data. Force audit insert/commit failure, timeout and worker outage; require no private response or success event. Deny public/private caches and streaming.
- [ ] **Negative matrix:** anonymous, normal USER, legacy ADMIN without explicit real chain, wrong role/association/case/resource, expired/revoked/suspended identity/session/key/member/grant, replayed/wrong origin/session assertion, forged selectors, stale versions, no audit writer and mismatched deployment config all deny at HTTP, service and DB boundaries. No lower-role access through legacy ADMIN flags.
- [ ] **Browser:** genuine passkey enrollment/assertion through real routes, exact Origin/CSRF rules and real session. Validate approved physical devices and assisted recovery before enforcement; virtual Chromium evidence alone is insufficient. Repeat login/logout/reload/context tests and retain initial failures separately from reruns.
- [ ] **Revocation:** revoke before authority locks and require denial; revoke behind a locked authorized read and verify commit ordering plus denial of subsequent reads. Invalidate auth/MFA versions and sessions as specified; test pool draining and issuer restart. Explain commit linearization and inability to recall delivered data.
- [ ] **Independent release review:** inspect immutable attributed read audit and projection canaries, verify no unrelated ACTIVE roles/actions/execution, verify full security/MFA/Admin/chat/rental/QR/GPS/camera/evidence regressions. Record exact artifact and migration hashes, reviewers and rollout stop criteria.
- [ ] **Tiny cohort:** after separate approval only, onboard the named cohort and exact grants; monitor denial/audit/outage rates and review every initial access. No automatic expansion.

## Stop and rollback procedure

Stop new issuance and real staff-read ingress first. Revoke/invalidate active bindings/grants/versions according to reviewed incident procedure; drain privileged pools and terminate compromised sessions. Restore the reviewed compatible application version with the real route disabled. Preserve forward schema and immutable security/credential/approval history; do not delete audit rows, downgrade historical migrations or resurrect revoked keys. Legacy Admin/session behavior must continue under its existing independent guards. Reconcile outstanding read transactions by their durable events; unavailable audit means fail closed. Reopening requires independent review, fresh proof and valid current grants.

No above checkbox is satisfied merely by writing this plan. Batch 6B's successful synthetic read proves the development workflow, not production readiness.
