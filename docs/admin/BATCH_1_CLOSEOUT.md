# Batch 1 independent review closeout

Verified 23 October 2026 UTC before Batch 2A edits.

- Actual Batch 1 branch HEAD and final implementation commit: `feature/admin-control-center-batch-1`, `98d24a918be7ce391c201cfd1822eb6ed84bbc36`.
- Planning preservation commit: `00d25fa49b353df105f0852a3cb29b4b2060920b`.
- Initial working tree: clean. Both commits and all four planning documents, the review report, verification manifest and four screenshots were committed. The gap analysis (267 lines) and roadmap (162 lines) have complete closing sections.
- Batch 2A branch: `security/admin-readiness-batch-2a`, created directly from that HEAD. The Batch 1 branch pointer, application UI, read-model queries and screenshots are unchanged.

## Independent screenshots

Open the [offline HTML gallery](batch1/index.html), or the original [desktop](batch1/admin-1440.png), [tablet](batch1/admin-820.png), [mobile](batch1/admin-390.png) and [open mobile navigation](batch1/admin-390-navigation.png) PNGs. No server, account or database is needed. [SHA-256 manifest](batch1/SCREENSHOT_MANIFEST.txt) identifies the exact committed evidence; byte-for-byte comparison against Batch 1 confirms these are unchanged. A portable ZIP with the HTML gallery, PNGs and manifest was also produced as a local review artifact.

## Metric explanation verification

Checked `app/admin/page.tsx` against `lib/admin/data.ts::getAdminOverview`:

| Metric | Actual calculation and scope |
| --- | --- |
| Active rentals | `Booking.status = IN_USE` only. Pending pickup, return pending, inspection and disputed bookings are excluded. Status describes the normal receipt lifecycle; it is not current GPS verification or observed physical possession. |
| Active users | `User.accountStatus = ACTIVE`, including administrators; not online presence or recent engagement. |
| Open cases | OPEN listing report rows plus OPEN dispute rows; no closed cases, reviewer-scoped chat cases or future support tickets. |
| Needs attention | Distinct listings having OPEN reports plus distinct bookings having OPEN disputes; multiple reports do not multiply the listing count. A listing and booking are different resources. No pending owner booking request is counted as an administrator task. |

All four displayed explanations accurately describe the queries. The API's legacy `bookings.activeRentals` compatibility field still has its older, wider lifecycle definition; the Overview intentionally uses `dashboard.activeRentals`. This distinction is documented in the original [Batch 1 report](ADMIN_BATCH_1_REVIEW.md). No verified presentation defect was found and no Batch 1 implementation was changed.

## Changes and failures since the original report

No intervening commits or uncommitted modifications existed at closeout. The original report's final TypeScript, lint, build, Admin, moderation, chat, stability and meetup checks passed. It disclosed the corrected fixture-cleanup failure and did not claim that a passing camera run fixed the earlier intermittent failure.

New security changes, dependency updates, fresh test outcomes (including any initial failures and reruns) and unresolved risks are recorded separately in [Batch 2A's security report](SECURITY_READINESS_BATCH_2A.md). They do not retroactively change the Batch 1 evidence or establish that Batch 1 caused a later failure.
