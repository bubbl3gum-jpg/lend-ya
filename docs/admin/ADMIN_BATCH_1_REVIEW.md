# Admin Control Center — Batch 1 review

Prepared 23 October 2026 UTC. Branch: `feature/admin-control-center-batch-1`.
Base: `cf215e0bdda92d7874329f16102c2a9ebd20a1be` on `feature/temporary-local-meetup-testing`; `git ls-remote` confirmed the remote still matched during this batch. No merge, push or deployment performed.

## Preparation and scope

The checkout started on the requested reference branch with no tracked modifications. The four existing planning documents were untracked; all were preserved in prerequisite commit `00d25fa49b353df105f0852a3cb29b4b2060920b` on the new branch:

- [Approved blueprint](ADMIN_CONTROL_CENTER_BLUEPRINT_V1.md): 119 lines.
- [Gap analysis](ADMIN_GAP_ANALYSIS.md): 267 lines.
- [Permission matrix](ADMIN_PERMISSION_MATRIX.md): 121 lines.
- [Implementation roadmap](ADMIN_IMPLEMENTATION_ROADMAP.md): 162 lines.

The gap analysis and roadmap have complete final sections and closing appendices; neither is truncated. This batch implements presentation and read models only. The four-role migration, provisioning, approvals and operational powers described in the planning documents remain proposals.

## Layout before and after

| Area | Before at the base | After |
| --- | --- | --- |
| Navigation | Flat list of eight destinations; “Lend Ya Admin” branding | Hustlen’ branding; four grouped categories; all eight destinations retained |
| Overview | Many user/listing/booking statistic cards, followed by recent records | Introduction; four equally sized metrics; prominent Requires Attention; platform activity; existing recent records |
| Metrics | Active-rental headline included pending handoffs | Dashboard counts `IN_USE` only, with explicit scope; legacy API compatibility field unchanged |
| Small screens | Native navigation disclosure and scrollable directory tables | Disclosure retained; grouped links, keyboard access, focus outlines, skip link and bounded main content; existing tables/forms retained |
| Review queues | Accessible through directories | Open report/dispute links surfaced without case contents or new actions |

Sidebar: General → Overview; Operations → Bookings, Disputes, Listings, Reports; Community → Users, Chat moderation; System → Audit Logs. Locations, Support, Announcements, Platform Settings and Security have no links because those Admin destinations are not implemented.

At desktop widths the sidebar remains fixed and independently scrollable. Below 1024px it becomes a native keyboard-operable disclosure. Metrics use four columns at wide desktop, two at tablet, one at mobile. Main content is bounded at `max-w-7xl`; existing tables retain their own horizontal scrolling instead of overflowing the page. Active descendants keep their parent navigation item highlighted with `aria-current="page"`.

## Screenshots

Actual Chromium captures from the successful Admin suite, using synthetic fixtures in a fresh owned database. Capture run: `7e8f2b1719d3bdd5620c9014`. Full-page screenshots can be taller than the viewport. These are rendered UI captures, not design mockups.

- [Desktop, 1440 × 1000 viewport](batch1/admin-1440.png)
- [Tablet, 820 × 1180 viewport](batch1/admin-820.png)
- [Mobile, 390 × 844 viewport](batch1/admin-390.png)
- [Mobile with navigation open](batch1/admin-390-navigation.png)

## Exact metric definitions and source queries

Source: [`lib/admin/data.ts::getAdminOverview`](../../lib/admin/data.ts), rendered by [`app/admin/page.tsx`](../../app/admin/page.tsx). Queries share the existing read-only `RepeatableRead` transaction, so counts form a consistent database snapshot. They are evaluated on page request, not streamed live.

| Display | Definition | Source query / calculation |
| --- | --- | --- |
| Active rentals | Bookings whose persisted status is exactly `IN_USE`. Pickup receipt is confirmed in the normal lifecycle and return has not yet been submitted. Excludes `HANDOFF_PENDING`, `RETURN_PENDING`, `INSPECTION`, disputes and completed/cancelled records. This is a lifecycle status count, not GPS or physical-location verification. | `tx.booking.groupBy({ by: ["status"], _count: true })`; `byStatus.IN_USE ?? 0` |
| Active users | All accounts with `accountStatus = ACTIVE`, including administrators, regardless of registration age. Does not measure online sessions, recent logins or engagement. | `tx.user.count({ where: { accountStatus: "ACTIVE" } })` |
| Open cases | Number of open listing reports plus open rental disputes. Multiple reports against one listing are separate cases. Excludes resolved/reviewed/dismissed cases, private support tickets (not implemented) and reviewer-scoped chat cases. | `tx.listingReport.count({ where: { status: "OPEN" } }) + tx.dispute.count({ where: { status: "OPEN" } })` |
| Needs attention | Number of distinct listings with at least one open report plus distinct bookings with at least one open dispute. A listing and a booking are different resource types, even if they share a numeric ID. This is affected-resource count, not a task or SLA count. | `tx.listing.count({ where: { reports: { some: { status: "OPEN" } } } }) + tx.booking.count({ where: { disputes: { some: { status: "OPEN" } } } })` |

Requires Attention uses those same case/resource aggregates. Links go to `/admin/reports?status=OPEN` and `/admin/disputes?status=OPEN`. Pending owner booking requests never enter these aggregates or become Admin tasks. Zero counts produce a clear-queues message; zero activity produces an explicit empty state.

Platform activity selects the latest six `AdminAuditLog` rows, ordered by `createdAt DESC, id DESC`, selecting **only** `id`, `action`, `targetType`, `targetId`, `createdAt`. No reason, state snapshots, message contents, evidence bytes or actor profile is queried for this section. Existing recent-record projections are retained and labelled separately from the audit log.

Compatibility: existing `/api/admin/overview` fields and semantics are unchanged. Its legacy `bookings.activeRentals` still counts `HANDOFF_PENDING`, `IN_USE`, `RETURN_PENDING`, `INSPECTION`; consumers must use the new additive `dashboard.activeRentals` for the narrow dashboard metric. No endpoint or existing payload field was removed. The additive `dashboard` object contains counts and bounded audit metadata only; existing Admin authentication/cache headers apply.

## Preserved routes and authorization

All existing pages, detail pages and APIs remain at their existing paths:

- `/admin`; `/admin/users`, `/admin/users/[id]`; `/admin/listings`, `/admin/listings/[id]`; `/admin/bookings`, `/admin/bookings/[id]`.
- `/admin/reports`, `/admin/reports/[id]`; `/admin/disputes`, `/admin/disputes/[id]`; `/admin/chat`; `/admin/audit-logs`.
- Existing `/api/admin/**` routes, `/api/admin/disputes/[id]/evidence/[photoId]`, chat review endpoints and ordinary participant endpoints are unchanged.

[`lib/admin/auth.ts`](../../lib/admin/auth.ts) remains unchanged: pages require a current `ADMIN` with `ACTIVE` account status; anonymous visitors redirect to login, non-admin/inactive visitors receive not-found. Read APIs still return 401/403 as appropriate and `private, no-store` / `Vary: Cookie`.

[`lib/admin/mutations.ts`](../../lib/admin/mutations.ts) retains origin/JSON/body validation, transactional actor rechecks, all existing operation constraints and atomic audit writes. No existing form or mutation service was edited. [`lib/admin/evidence.ts`](../../lib/admin/evidence.ts) retains actor and booking scope checks and commits access auditing before releasing evidence bytes. Chat review still requires its separate grant, assignment and conflict checks in [`lib/chat/moderation.ts`](../../lib/chat/moderation.ts); an Admin sidebar link grants no reviewer capability.

No schema, migration, MRT catalogue, meetup service, GPS policy, receipt/checklist rule, booking transition or dispute protection was changed. Temporary GPS testing remains restricted to the existing isolated disposable test mode; no Admin simulation controls were added.

## Verification

Commands and measured results are listed below. Database suites ran through the existing `tests/run-isolated.ts` ownership harness; none targeted an existing application database. Each target was a newly created local `hustlen_test_b1_*` database, with a random matching ownership marker. Creation fails rather than adopting an existing database. Cleanup rechecks ownership and drops only that run’s database and recorded uploads. Every suite reported successful owned-database cleanup, including the QR run.

| Command | Actual result |
| --- | --- |
| `npx tsc --noEmit` | PASS, exit 0 |
| `npm run lint` | PASS, exit 0 |
| `npm run test:unit` | PASS, 41/41 |
| `npm run test:admin` | PASS on corrected run, 7/7 |
| `npm run test:moderation` | PASS, 10/10 |
| `npm run test:chat` | PASS, 14/14 |
| `npm run test:stability` | PASS, 8/8 |
| `npm run build:verify` | PASS; invokes production Next build against a fresh isolated database |
| `npm run test:meetup` | PASS, 9/9, including synthetic-camera two-browser scenario |
| `git diff --check` | PASS |

For database commands the harness was supplied a new `MRT_TEST_DATABASE_URL` per invocation and `MRT_BROWSER_PATH=/usr/bin/chromium`, `CHROMIUM_PATH=/usr/bin/chromium`, `MRT_TEST_KEEP_ON_FAILURE=0`. Credentials are taken from the local environment and are not stored here. To reproduce, select a **new**, local `hustlen_test_*` database name, keep it distinct from `DATABASE_URL`, and run the command through its npm harness; do not invoke integration files directly or reset an existing database.

New Admin assertions cover empty counts; the narrow `IN_USE` definition across every rental status; suspended-user exclusion; open-versus-closed cases; two reports deduplicated to one listing; metadata-only activity; private sentinel exclusion in API and HTML; all four navigation groups and exactly eight live links; active-page state; focus and Enter-operated mobile disclosure; screenshots at 1440/820/390; and page-overflow checks for directories, details, reports, disputes, chat and audits at tablet/mobile widths. Existing browser form/filter/pagination/login/logout tests remain intact. Existing moderation/chat/stability suites verify actions, evidence scope, immutable records, reviewer access and audit failure handling.

The first Admin run had all six subtests pass but failed in my new fixture cleanup because it attempted to delete an immutable audit fixture. The database correctly refused. Cleanup was corrected to retain that fixture and its actor until the owned database is dropped; no trigger or application rule was weakened. The final run passes 7/7 and cleans up its database.

The synthetic-camera QR browser regression previously failed at `tests/meetup.integration.test.ts:1476` waiting for “Verified booking” at the base SHA. In this batch’s run it **passed**, including the actual camera scan with two mobile browser sessions; all 9 meetup tests passed. No QR application or test source was changed, so this result does not establish a Batch 1 fix or prove the earlier intermittent failure is resolved. The previous failure must not be attributed to this UI batch. This run also verifies temporary-mode consent, `TEST_LOCATION`, revocation, restart, location accuracy/freshness, receipt gates, challenge replay/expiry and ordinary return protections.

Run identifiers: Admin `7e8f2b1719d3bdd5620c9014`; moderation `4e79091afb80b64766a7fbd3`; chat `3fbe766888e3375b5a28ae3b`; stability `a6ffaa13814d1cd34160c9c1`; build `f31078185388c914ddc92fe1`. See the committed [verification manifest](batch1/verification.json) for the meetup run, timings, exit codes and cleanup evidence. Test counts include each Node test parent as reported by its runner.

Local raw logs and run manifests are under `/tmp/hustlen-admin-batch1/`; committed screenshots above preserve review evidence. This is functional Chromium and source verification, not a formal assistive-technology or production-scale performance audit.

## Changed files and review boundary

Implementation:

- `app/admin/layout.tsx`: branding, responsive shell, skip/focus navigation and bounded main content.
- `components/admin/navigation.tsx`: grouped links and descendant active state.
- `app/admin/page.tsx`: four metrics, attention queues, metadata activity and retained recent records.
- `lib/admin/data.ts`: additive, transaction-consistent dashboard aggregates/projection.
- `tests/admin.integration.test.ts`: meaningful read-model/privacy/navigation/responsiveness coverage and immutable-fixture-safe cleanup.

Documentation: this report, four screenshots in `docs/admin/batch1/`, and the four preserved Blueprint planning documents in the prerequisite commit.

Unfinished by design: limited staff roles, staff provisioning, approvals, Locations/Test Lab, Support, Announcements, Platform Settings, Security screens, online-user telemetry, staff-task/SLA metrics and AI. Those require separate approval and later batches. No missing feature is represented by a dead navigation link or fabricated metric.

Stop after committing this isolated batch for independent review. No merge or deployment is authorized by these results.
