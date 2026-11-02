# Integration merge-readiness review

2 November 2026. Application revision `c136dc9a355138ea306faa41dd95514524d0fc87`; subsequent audit commits change documentation/evidence only.

## Git and checks

- Remote integration and local application HEAD initially match exactly, ahead/behind 0/0.
- `origin/main`: `f856dc360b332007dd79725ddee0d28102411521`; main is an ancestor, 161 integration commits ahead at the reviewed application revision.
- Read-only `git merge-tree --write-tree origin/main HEAD` yields `851a51befa71cd978ff5ae777e3eb5dbf6da0c8e`, identical to the integration tree. No textual conflicts at those tips. No merge/ref update performed on main.
- Latest application workflow [41392391175](https://github.com/bubbl3gum-jpg/lend-ya/actions/runs/41392391175) reports **Success** for c136dc9. It includes the original integration, genuine-camera meetup, migration, rental, Admin/moderation and MVP tests; see `.github/workflows/verify.yml` for exact command inventory.
- A new documentation/evidence push requires its own workflow conclusion; do not transfer the older run’s success to an untested new SHA. Final push/check status is reported separately.
- Branch-protection/required-check API access returns Forbidden in this environment. The configured workflow is observable, but extra GitHub rules, required reviewers and externally configured checks cannot be independently enumerated. Repository owner must confirm those requirements before merging.

## Fresh exact-main forward-upgrade verification

[Machine-readable evidence](main-upgrade.json): a new marked owned disposable database received exactly main’s eight migrations, then synthetic historical users (including legacy Admin), a session, listing/station association, completed booking and pickup/return JSON evidence references. The original full integration chain was then applied chronologically using `prisma migrate deploy`.

Result: **PASS**, 8 → 33 migrations. Original eight SQL files byte-identical; all 33 migration checksums/finished states match; original-column projections of User, AuthSession, Listing, ListingStation, Booking, Handoff, Return and MrtStation preserved; legacy session retained; zero automatic StaffMembership creation; second deploy reports no pending migrations. Owned database and temporary migration directory removed. No existing application database was modified.

Initial probe setup failed because a parameterized PostgreSQL query contained multiple statements. It was corrected by splitting the fixture insert into separate parameterized calls, then rerun against another new owned database. This was a temporary probe defect, not a migration SQL defect. Historical SQL was never edited.

Limitations: this focused sample is not a production data clone or exhaustive proof across every nullable historical record, media byte payload, Support history or constraint edge case. Existing migration/security suites remain necessary. Some intentional new-column backfills exist; preservation compares pre-existing columns, not a claim that an upgraded row has no additional fields. Prisma migration replay is forward compatibility, not proof that old application binaries are safe after every new constraint. Review backup/restore and deployment sequencing independently; no destructive down migration proposed.

## Regression and merge risks

- Large scope: application comparison against main spans 1,887 files and 161 commits at c136dc9, including historical milestone documentation. A clean merge tree is not proof of semantic safety.
- Prior meetup historical-upgrade fixture defect was corrected in `003961deff8f541ceda119308f90005e33d653ed`; no historical migration edits. Prior MVP hydration/input race corrected in c136dc9 with real readiness guards. Both are included in the successful workflow.
- Audit changes add only Markdown, JSON provenance/metrics and synthetic screenshots. No new app-code regression is introduced by this audit, but remaining design defects are real: most importantly dark MRT dialog contrast, header-only theme inheritance, auth/authoring shell discontinuity and long operational forms.
- Production readiness remains bounded by the canonical roadmap and existing feature gates: no staff-role rollout, Support production access, publishing/settings approval, live Vision/translation/provider activation or private-image export is inferred from CI.
- Genuine model quality/latency, Mac resource behavior, deferred owner acceptance and visual approval are not established by deterministic tests or this audit.
- Before merge: review migration privileges/locking/backups, changed security-sensitive services, configured branch protections, remaining accepted product blockers and the final pushed SHA’s workflow. Before deployment: separately approve operational gates and runbook. Merge is not deployment authorization.

## Recommendation

Technically conflict-free and supported by a green application workflow plus a successful exact-main migration sample. Suitable for independent merge review, **not an unconditional production-ready recommendation**. Resolve or explicitly accept the documented UI/accessibility and operational risks. Do not merge without owner approval.
