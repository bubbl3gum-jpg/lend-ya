# R6 historical booking timestamp risk assessment

Date: **2026-11-04**. **Conclusion: potential exposure, insufficient evidence
for correction. No correction is justified by the examined evidence.**
This is a newly inspected source/provenance assessment, not confirmation of the
former chat's conclusion by quotation. No real affected record has been
identified; absence of evidence also does not establish that no customer was
affected. No historical database was read or modified and no correction program
or migration is supplied.

## Scope and provenance

Checkout `/workspace/lend-ya-recovery`, branch
`recovery/candidate-validation-20261103`. Starting source/local/independently
queried remote: `0e8bd63be4e5db5e73f9d9b2cf2e02b0f1a79611`, with a clean tree.
Origin is `https://github.com/bubbl3gum-jpg/lend-ya.git`; known checkpoints are
ancestors, not reset targets. The repository is not shallow. Reviewed root
`AGENTS.md`, `BOOKING_TIME.md`, `DATABASE_REGRESSIONS.md`,
`STABILIZATION_RECHECK.md`, recovery reports, relevant path/pickaxe Git history,
current and historical API/form/helper code, schema, legacy-copy migration,
seed, test fixtures, Compose and the checked-in verification workflow.
No production DB, customer logs, deployment account, remote deployment API,
secret file or existing developer database was accessed. The original
`/workspace/lend-ya` checkout was not used or modified. No missing original
patch is claimed recovered.

## Source timeline, not deployment timeline

| Revision / source evidence | Input and parsing path | What it proves / does not prove |
| --- | --- | --- |
| `51c0169147d90a052851d476f2482aa5473354cd`; also verified in old audit baseline `f856dc360b332007dd79725ddee0d28102411521` | `components/booking-form.tsx` sends raw `datetime-local` `startAt`/`endAt` strings to `POST /api/bookings`. Its `parseDateTime` checks string type, calls `new Date(value)`, then rejects NaN. Positive elapsed duration is rounded up to 24h days. | A naive datetime was interpreted in the **server process's local timezone**, not automatically the browser's zone or Taipei. Explicit Z/numeric offsets identify instants. Source demonstrates exposure if this path was deployed and its input meant a different zone; it does not show customer use or the server zone. |
| `18529a30bb7da3c3db08baca614ef1fe2764eb10` introduces `lib/booking-time.ts`; verified inherited by candidate `cf61149442229fc60d2879752e8574a5df5c493e` | API switches to `parseRentalTime`. Missing zone defaults explicitly to `+08:00`; calendar/clock/offset checks precede conversion. Form still sends naive local strings and labels rental time Taipei. | Modern future naive input denotes Taipei independently of host zone. This source change neither fixes nor identifies earlier rows. Fixed +08 conversion is not a general historical Asia/Taipei tzdata converter (R4 handles historical display separately). |
| `0f5c9ddea4c091f9a073b768c20bad4134317e2e`, inherited by candidate | Durable request identity hashes canonical ISO instants/business terms, scoped to renter/key. | A canonical hash is not a preserved raw input string or a historical timezone record. Missing key/hash is not proof of a particular origin; different equivalent inputs can normalize to the same terms. |
| R3 `de79da976007660167d2f4ac60edb7f69ed26212`, retained today | Maintained form converts Taipei input via `taipeiInputInstant` before quote/create. New API operations require explicit Z/offset with strict calendar/precision validation. | Prevents host-zone interpretation for new maintained writes; does not retrospectively establish participant intent. R3's future/year/policy checks are not the historical parser and are not used as its reproduction. |
| Same R3 revision, current `POST /api/bookings` authenticated replay path | Legacy `parseRentalTime` can establish a canonical hash only for an existing matching `(renterId, requestKey)` operation. Stored payload/quote must match; replay occurs before current future/policy checks. Unknown naive operations cannot create/quote. | Compatibility is for the candidate's Taipei-normalized stored operations, not a correction/detection mechanism for host-local-era rows. It does not try alternative zones, rewrite hashes or change timestamps. R6 leaves this behavior unchanged. |

These revisions are source-history anchors. Commit order and ancestry establish
code availability, not deployment dates, active client versions, customer use or
runtime settings. **Git author/committer offsets and the present shell timezone
are not historical server-timezone evidence.** No assertion of a UTC production
server follows from local tests or Ubuntu CI.

## Available provenance and its limits

| Origin/evidence examined | Assessment |
| --- | --- |
| Schema and legacy migration | Booking `startAt`/`endAt` are Prisma DateTime backed by PostgreSQL `TIMESTAMP(3)` without time zone. `20261006150000_booking_lifecycle_backbone/migration.sql` copies `RentalRequest.startDate/endDate` into Booking while preserving request IDs. This is a possible **imported/legacy origin**, not proof that the migration processed real rows. Original writers, their serialization and database/session timezone handling need separate provenance. Do not classify every row by the later booking endpoint alone. |
| Persisted identity/context fields | Booking has date fields and optional request key/hash, not original input text or server TZ. Current API writes follow the tested UTC-normalized convention, but a TIMESTAMP WITHOUT TIME ZONE column does not intrinsically establish that convention for unknown historical writers. Documentation review contexts store canonical terms/digests; they can support provenance but do not inherently retain the original naive string or prove intent. Timestamp column text or a driver's Date is not itself evidence of how the user entered the time. |
| Development seed | `prisma/seed.ts` explicitly creates local demo bookings from `new Date()` plus host-local `setDate` arithmetic; totals are demo literals. This is a separate synthetic path, not the naive API input path. Existing non-destructive/local-only safeguards remain unchanged. A fixture name or demo-like amount alone must not identify an unknown real record as seed data. |
| Test fixtures | R3 API inserts a synthetic now-past legacy operation; R4 browser inserts a synthetic 1979 history fixture; R5 uses fresh owned databases. These establish test behavior only. No test fixture is evidence of customer harm, and their cleanup/empty databases cannot establish absence of production users. |
| Candidate replay audit | `docs/audits/2026-11-02/stabilization/02_BOOKING_REPLAY_TEST_ISOLATION.md` reports node-postgres interpreting TIMESTAMP WITHOUT TIME ZONE in a test process zone, then rebuilding an incorrect retry payload. Current captured-request replay tests avoid that path. The report is inspected historical test evidence, not a newly rerun Mac/production incident or proof that stored server-created bookings were wrong. |
| Compose / CI / local reports | Compose describes a PostgreSQL development service; no application deployment/runtime timezone is established. `.github/workflows/verify.yml` runs isolated checks, not deployment, and does not pin historical app TZ. Git history of these files and the examined recovery/audit reports supplies no authenticated deployed artifact-to-customer-record mapping. No hosted workflow/deployment account was queried. |
| Explicit-offset vs naive requests | A trusted captured explicit request can rule out the specific **host-local naive parsing** cause for that request. It does not prove the user chose the intended instant. A stored UTC-looking instant cannot distinguish explicit input, naive server-local input, seed or import. |

### Evidence required before selecting any real record

Obtain separate authorization and a minimally scoped, access-controlled evidence
set, with provenance/redaction and retention controls:

1. Deployed artifact/revision, rollout intervals, running instance identity and
   client version for the operation, including any mixed old/new deployment.
2. Historical Node process timezone and runtime/ICU/tzdata at that instance and
   instant (TZ/OS configuration or trustworthy runtime capture). Separately
   establish DB/session/driver timestamp serialization for imported/direct-SQL
   origins. Current settings or a Git timestamp are insufficient.
3. Original authenticated start/end strings and their Z/offset presence, linked
   securely to the operation/record; raw clock input and displayed confirmation
   where available. Do not indiscriminately collect customer logs or credentials.
4. Trustworthy participant intent/accepted terms: which local zone the clock
   represented, quotation/acknowledgement, and any contemporaneous agreement.
   A marketplace's current Taipei rule cannot retroactively supply missing intent.
5. Record origin and immutable lineage (API, seed, import, manual write, prior
   correction), IDs and related snapshots/history. Canonical hashes, wall-hour
   patterns or creation dates alone do not establish this lineage.

Until these align for specific records, unknown-origin/already-correct/ambiguous
cases must be excluded. There is no evidence-backed affected-record list here,
and no basis for a blanket timezone adjustment.

## Database-free synthetic demonstrations

Five tests added to existing `tests/booking-time.test.ts`; existing strict API,
Taipei conversion and historical display cases remain. The historical helper is
a test-local reproduction of the old `parseDateTime` (`new Date(value)` plus
type/NaN checks), run in separate Node processes with explicit TZ. It does not
call today's new-booking validation or introduce an application parser.

- Naive `2020-07-01T10:00` becomes **10:00Z in UTC**, **02:00Z in Taipei**,
  **17:00Z in Los Angeles**; LA winter uses 18:00Z. There is no universal offset
  correction across unknown server zones/seasons.
- Explicit `10:00+08:00`, `02:00Z` and previous-day `19:00-07:00` identify the
  same instant in every examined host zone.
- Different raw strings/zones collapse to one stored ISO value. That value
  alone cannot determine original input or whether a claimed Taipei intent was
  true; the reproduction demonstrates non-unique provenance, not intent inference.
- Naive noon-to-noon across LA's 2020 fall transition lasts **25h**, rounding
  to **2 elapsed days**, versus Taipei/UTC 24h/1 day. Spring is 23h versus 24h.
  These are synthetic risk calculations, not changes to agreed billing.
- A hypothetical single-record endpoint proposal can overlap an already-correct
  neighboring reservation where stored intervals did not overlap. Fixed explicit
  before/after fixtures are compared without applying them or offering a shift
  routine. No existing timestamps, prices or hashes are touched.

### Executed checks and reused evidence

| Check | Actual result |
| --- | --- |
| `TZ=UTC node --import tsx --test tests/booking-time.test.ts` | Pass, 13 tests, zero failures/skips. |
| Same focused command with `TZ=Asia/Taipei` | Pass, 13 tests, zero failures/skips. |
| Same focused command with `TZ=America/Los_Angeles` | Pass, 13 tests, zero failures/skips. |
| `TZ=UTC npm run test:unit` | Pass, 214 tests, zero failures/skips. |
| `TZ=America/Los_Angeles npm run test:unit` | Pass, 214 tests, zero failures/skips. |
| `npm run typecheck` | Pass, full Next type generation and project tsc. |
| `npm run lint` | Pass, no diagnostics. |

Tested revision is the starting SHA plus the test-only changes committed with
this report. No unexpected test failure occurred. Session-local logs are
`/tmp/lend-r6-*.log`. No database was created/connected for R6; no cleanup of an
existing database or upload was needed. R5's actual database/concurrency/API/
browser/baseline results at `0e8bd63` and R4's initialized-isolated-database full
build at `3def2e5` remain **reused, dated evidence**, not newly executed R6
checks. Application, schema, migrations, dependencies and R3 replay are
unchanged. Clean install/generation/build/database/browser suites were not
repeated for these documentation/database-free test changes. The separate
**empty-schema build failure remains open**.

## Conditional future process — dry-run planning only

No correction is presently justified. If separately authorized evidence later
confirms specific wrong endpoints, prepare a separate reviewed plan before any
write. Do not infer an affected cohort from a shared hour, ID range or old SHA.

1. Freeze a versioned, evidence-backed allowlist with record IDs, origin,
   original inputs, deployed parser/runtime, intended zone and confidence/source
   references. Explicitly exclude unknown-origin, ambiguous, already-correct,
   seed/test and previously corrected records. Resolve conflicting participant
   evidence manually; do not guess DST folds/gaps.
2. Produce a **read-only dry-run manifest** with original/proposed endpoints,
   durations, elapsed billed days, status, related snapshots and stable row
   fingerprints. Review before/after local and UTC representations per endpoint.
   Analyze potential billed-day differences without recalculating or changing
   agreed totals/deposits, currency, idempotency hashes/keys or accepted
   documentation snapshots.
3. Analyze half-open overlaps against *all* relevant neighboring reservations,
   including already-correct and other proposed rows; evaluate current custody/
   dispute restrictions separately. Stop on new conflicts or inconsistent
   timeline/evidence. The synthetic example above shows why selective changes
   need this review; it is not an affected-record selection rule.
4. Establish how any approved correction can preserve immutable history,
   accepted terms, replay equivalence and audit obligations. Current constraints
   and canonical hashes may prohibit an in-place timestamp edit; do not disable
   constraints or rewrite idempotency to make it pass. A separately reviewed
   reconciliation design/product decision may be necessary, not a simple update.
5. Require verified encrypted backup, tested restore in an isolated environment,
   exact inverse before-image/rollback and dependency analysis. Define narrow
   authorization, maintenance/concurrency controls, stable lock order, version/
   fingerprint rechecks and atomic all-or-nothing behavior. Re-evaluate overlaps
   under those controls before any separately approved execution.
6. Specify append-only audit events linking evidence, reviewer/authorization,
   dry-run version, before/after, reason and outcome without exposing secrets.
   Reconcile affected participant communications/support obligations and define
   rollback triggers and post-checks. Rehearse with synthetic fixtures and
   independently review the dry run before requesting execution authorization.

This document supplies no executable correction or blanket shift. R6 acceptance
is the evidence-based assessment and synthetic coverage, not data remediation.
Next is **R7: remaining owner/renter navigation coverage**, preserving current
lifecycles, direct links, history permissions, evidence, feature gates and all
R1–R5 work.
