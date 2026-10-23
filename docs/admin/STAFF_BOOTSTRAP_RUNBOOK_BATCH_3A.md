# Controlled staff bootstrap and reconciliation runbook

24 October 2026 (Asia/Taipei). **Preparation only. No step below has provisioned actual staff, changed an existing database or activated a role.** Batch 3A's database CHECK constraints prohibit ACTIVE memberships/grants. This document is not authorization to remove them.

## Preconditions for a future separately approved rollout

- Complete scoped DAL and server-side actor enforcement across the [full legacy inventory](LEGACY_ADMIN_AUTHORIZATION_INVENTORY.md), including private media, evidence helpers, moderation, CLI and case projections. No role-name shortcut or legacy ADMIN fallback for new staff.
- Review canonical human proofing, MFA/recent step-up, persistent session/epoch binding, retention and protected audit actor provenance. Establish dedicated runtime DB privileges with no DDL/trigger bypass; keep migration credentials separate. Exercise backup/restore and application rollback in staging.
- Approve explicit role allocations and bounded capability scopes. Role eligibility is necessary but never a blanket grant. Resolve the policy-blocked entries using a new reviewed policy version, not an editable flag.
- Have at least two distinct independently verified, authorized humans available for sensitive bootstrap decisions. Check shared person IDs, all known account aliases, conflicts and investigator/participant exclusions. Alternate accounts and service principals never provide an independent vote.

## Reconcile without automatic promotion

1. Inventory existing ADMIN accounts, enabled/disabled ChatReviewer grants, sessions and assignments into a restricted review system, not Git or general application logs. Preserve historical identifiers and grants exactly; record uncertainty rather than infer a role.
2. Independently verify each human through an approved canonical identity source. Use one canonical digest per person, an opaque evidence reference and minimal retained proof; do not accept self-selected hashes. Consolidate all known aliases to the same person before assessing independence. Hold disputed or ambiguous matches.
3. For every proposed person/role/scope, obtain sponsor and independent human review outside this unimplemented system. Record reason, immutable decision/evidence references, expiry, permitted cases/channels and explicit exclusions. Existing ADMIN does not imply Super Admin; ChatReviewer does not imply Moderator. Unknown accounts receive nothing.
4. Review revocation, offboarding, orphaned cases and linked-account deletion/retention policies. Permanent associations cannot be retargeted; identity correction needs a separately designed, reviewed additive mechanism. Do not delete or rewrite history to fix an identity.

## Future bootstrap execution design — not executable in this batch

A separately approved, short-lived out-of-band procedure must attest the initial independently reviewed roster and verify its exact payload before any membership is activated. The current schema can hold UNVERIFIED persons and inert drafts but cannot authorize a writer or a first Super Admin. Do not pretend that inserting two VERIFIED rows establishes human independence. Future bootstrap must supply trusted external human verification and record both authorizing humans; the DB operator is not automatically a staff approver.

The first sensitive staff grant needs independently authorized reviewers under the final approved governance, with a narrowly scoped, time-limited bootstrap exception to the *initial absence of staff*, not to independent-human review. If suitable independent humans are unavailable, keep the system inactive and arrange coverage. Do not self-grant, share accounts, appoint an AI, grant legacy ADMIN to lower roles or suppress conflict checks.

Before execution, independently review a manifest containing exact person/account bindings, intended fixed role, resource/case/channel scopes, policy/epoch versions, validity, immutable decision references and source migration checksum. Use one reviewed transaction per intended operation with locked/current actor and target state, audit failure rollback and idempotency. No universal/wildcard grants. The activation constraints may only change in a separately authorized forward migration once the complete enforcement path is ready. No SQL bootstrap command or provisioning script is provided here.

## Rehearsal, incident response and rollback gates

Rehearse only with fresh owned disposable fixtures: no staff rows seeded by migrations, no permission change for existing sessions, aliases denied as independent actors, self/forged/stale grants rejected, revoked humans denied, audit failure atomic, all evidence and case scopes preserved. Test mixed application versions and revocation during in-flight requests. Confirm that inactive database records confer no access through every legacy path.

During a future approved rollout compare the exact reviewed roster and grants against resulting records and epoch history using a protected read-only reconciliation report. Independently review discrepancies; stop further provisioning rather than broadening scopes. Do not log raw proof data, tokens, private messages, evidence bytes or test GPS coordinates.

For a future incident, use the separately reviewed revocation/session-invalidating procedure and stop new operations. Retain additive schema, provenance and immutable history. Roll back application code without destructive down migrations or restoring ADMIN flags to new staff. A failed migration requires verified transaction state and reviewed forward recovery; never run `migrate reset` or edit old checksums. The only `migrate resolve` exercised in Batch 3A was on the deliberately failed new migration in an owned disposable test fixture.

## Approval and small-team limitations

No production roster, activation approval or actual staff identity is included. High-risk decisions require distinct currently authorized humans, excluding targets, participants, investigators/recommenders and conflicted prior reviewers. A small team may need additional independently eligible reviewers, particularly for Super Admin grants or appeals. Lack of coverage means hold the action; it does not authorize a self-approval exception. Independent approval persistence/execution is deferred.
