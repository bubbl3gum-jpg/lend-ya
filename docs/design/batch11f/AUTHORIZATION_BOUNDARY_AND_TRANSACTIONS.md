# Session and transaction boundary

## Committed revocation versus running work

1. A committed candidate password change deletes every persisted AuthSession for the trusted user, including the current session. Required credential/event/revocation failure rolls the transaction back. New requests resolving those tokens after commit are denied; an expired session is not revived.
2. Request entry authorization is not general cancellation. A request which already resolved its user can complete later unless its own operation rechecks current authority at the appropriate boundary. The new browser test deliberately holds an owned User row, starts an authenticated display-name PATCH, logs out, proves a new PATCH is 401, then releases the row: the already-authorized low-risk PATCH completes 200. This is the actual contract, not a password-revocation bypass assertion or permission to update another user.
3. A response/cookie from a login authorized earlier can arrive after revocation, but cannot resurrect its deleted persisted session. A login attempting issuance after password commit must match the new exact credential snapshot.

## Actual synchronization

`lib/auth.ts:persistVerifiedSession` acquires advisory transaction lock `(1105001, trustedUserId)`, rereads the exact verified password hash and inserts the session in the same transaction. `lib/password-change/service.ts:changePassword` acquires the same lock, then User FOR UPDATE, current AuthSession FOR UPDATE, and rechecks expiry with `clock_timestamp()` after lock acquisition. Role/association/status and hash CAS are checked again; effective hash, remaining sessions and exact audit row are checked before commit. Scrypt work remains outside the locked section. The trusted Support worker uses the same credential lock/snapshot pattern and retains its additional ACTIVE/principal restrictions.

If login wins the shared lock, its session is included in subsequent revocation. If password change wins, stale verified login fails before insertion. Concurrent rotations cannot both commit from the same snapshot. Transaction exceptions, deadlocks and lock/transaction timeout errors fail closed; no retry bypass or longer timeout was added. Tests exercise lock waiting/expiry, stale snapshot, concurrent changes, denied and silently skipped writes. They are not an exhaustive production workload/deadlock proof.

## Sensitive-operation assessment

Reviewed `lib/rental-route.ts`, `lib/rental-lifecycle.ts`, `lib/marketplace-permissions.ts`, `lib/meetup/service.ts:requireMeetupReceipt`, staff/MFA and approval boundaries. Rental entry uses trusted current user; lifecycle locks Booking and enforces participant/stage/evidence/receipt constraints; handoff-start account checks use User shared locks. These are not universal session-incarnation checks. A User row lock serializes relevant account updates, but does not itself revalidate a session. Existing meetup receipt verification remains participant-bound and consumption/lifecycle checked. MFA/staff carry their own session/version/association constraints; this candidate excludes privileged identities and does not enable high-risk approval execution.

No high-impact cross-user, custody/evidence or privileged execution bypass was demonstrated by this review. Therefore no speculative application-wide epoch framework or endpoint rewrite was added. If production policy demands cancellation of **all already-authorized** mutations at password-change commit, that is not delivered: inventory each exact sensitive operation, establish lock ordering and introduce reviewed commit-boundary checks with focused race tests before activation. A repeat of getCurrentUser without serializing the operation would still leave a TOCTOU gap.

## Runtime privilege and failure assumptions

Fresh owned fixtures use the existing verified isolation harness and representative restricted principals in dedicated suites. Candidate password writes run with the existing application connection; this does not establish least-privilege production credential/event privileges. Event update/delete/truncate protections, revoked-session positive count and actor constraints are preserved. Database owner/superuser can change schema; neither triggers nor rereads defeat an adversarial owner. Production grants, backup/restore, retention, erasure, durable monitoring and trusted ingress must be independently reviewed. No existing application database or historical migration was changed.
