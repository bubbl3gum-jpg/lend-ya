# Recovery R2 — dependency security disposition

Registry review began **2026-11-03**; full/production audits and current-release
checks were refreshed **2026-11-04**, on
`recovery/candidate-validation-20261103` from
`1e88e9e6b2d0e68f3773ce5917035e2dda8be43a`. Branch, ancestry, clean working
tree and fetch/push origin `github.com/bubbl3gum-jpg/lend-ya` were verified;
the initial remote SHA matched. Root instructions, `RECOVERY_PLAN.md` and
`SETUP_REPEATABILITY.md` were read. This report supersedes earlier dependency
counts for the current recovery tree; older milestone reports remain historical.

## Before / after

| Check | Fresh result | Retrieval / exit status |
| --- | --- | --- |
| `npm audit --json` | 16 moderate affected-package entries; 0 low/high/critical; **1 distinct advisory** | Successful advisory retrieval; exit 1 because findings exist, not an authentication/network failure |
| `npm audit --omit=dev --json` | 0 production-installed findings | Successful advisory retrieval; exit 0 |
| `npm ls --all --json` | Installed dependency graph valid | Exit 0 |

Before and after dependency findings are identical: **no dependency, lockfile,
override, lint configuration, source, setup or feature-gate changes were made**.
Only this report and the README security summary change. Audits describe the
unchanged graph; the November 4 refresh confirms the same result as November 3.
Zero production findings does not establish application security.
Advisory databases are time-sensitive and cannot establish absence of unknown
vulnerabilities or unsafe application usage.

## Remaining advisory and actual paths

**[GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249)**:
minimatch globparts-amplification denial of service, **moderate**, affected
`<11.0.1`. Installed minimatch versions are **3.1.5** and **10.2.6**. These are
two installed nodes of the same advisory, not two distinct advisories. npm's
16 entries include propagation through parent/peer tooling packages.

All reported nodes were checked against lockfile `dev: true`; none appears in
the production-installed audit. Concrete installed paths:

| Direct root / path | Installed minimatch | Required range |
| --- | --- | --- |
| `eslint@9.39.5 -> minimatch` | 3.1.5 | `^3.1.5` |
| `eslint -> @eslint/config-array@0.21.2 -> minimatch` | 3.1.5 | 3.x consumer |
| `eslint -> @eslint/eslintrc@3.3.7 -> minimatch` | 3.1.5 | `^3.1.5` |
| `eslint-config-next@16.4.3 -> eslint-plugin-import@2.32.0 -> minimatch` | 3.1.5 | `^3.1.2` |
| `eslint-config-next -> eslint-plugin-jsx-a11y@6.10.2 -> minimatch` | 3.1.5 | `^3.1.2` |
| `eslint-config-next -> eslint-plugin-react@7.37.5 -> minimatch` | 3.1.5 | `^3.1.2` |
| `eslint-config-next -> typescript-eslint@8.71.0 -> @typescript-eslint/typescript-estree@8.71.0 -> minimatch` | 10.2.6 | `^10.2.2` |

Complete affected-package inventory (every row has the same moderate advisory,
directly or by propagation; disposition: retain pending compatible upstream fix):

| npm affected-package entry | Installed version(s) | How the finding propagates |
| --- | --- | --- |
| `minimatch` | 3.1.5, 10.2.6 | Direct advisory |
| `@eslint/config-array` | 0.21.2 | minimatch |
| `@eslint/eslintrc` | 3.3.7 | minimatch |
| `eslint` | 9.39.5 | minimatch/config-array/eslintrc; peer cycle through eslint-utils |
| `@eslint-community/eslint-utils` | 4.10.1, 4.9.1 | ESLint peer dependency |
| `@next/eslint-plugin-next` | 16.4.3 | eslint-utils |
| `@typescript-eslint/typescript-estree` | 8.71.0 | minimatch |
| `@typescript-eslint/parser` | 8.71.0 | typescript-estree / ESLint peer |
| `@typescript-eslint/utils` | 8.71.0 | typescript-estree / eslint-utils / ESLint peer |
| `@typescript-eslint/type-utils` | 8.71.0 | typescript-estree / utils / ESLint peer |
| `@typescript-eslint/eslint-plugin` | 8.71.0 | parser / type-utils / utils / ESLint peer |
| `typescript-eslint` | 8.71.0 | TypeScript ESLint family / ESLint peer |
| `eslint-plugin-import` | 2.32.0 | minimatch |
| `eslint-plugin-jsx-a11y` | 6.10.2 | minimatch |
| `eslint-plugin-react` | 7.37.5 | minimatch |
| `eslint-config-next` | 16.4.3 | Next / React / import / accessibility / TypeScript plugins and ESLint |

### Exposure and uncertainty

`eslint.config.mjs` imports Next core-web-vitals and TypeScript configurations.
`npm run lint` and `.github/workflows/verify.yml` execute affected matching code
over checkout files/configuration. Developer machines and CI can therefore be
affected by malicious/pathological patterns; development-only is not harmless.
The build environment installs this tooling, but `npm run build` itself is
`next build`, not a wrapper invoking ESLint; CI runs lint separately.

No application import of minimatch/mysql2 was found in inspected app/lib/scripts/
tests usage, and no marketplace request path to minimatch is established. That
is a scoped reachability observation, not proof that all tool paths are safe.
Do not treat untrusted checkout configuration as safe to execute merely because
production audit is empty. No exploit execution, suppression or rule disabling
was used to change the reported counts.

## Compatible-release assessment

Fresh `npm view` registry metadata, not the old audit's version assumptions:

| Component | Current stable/maintenance evidence | Decision / upstream change needed |
| --- | --- | --- |
| minimatch | Latest 11.0.4; fixed advisory range starts 11.0.1. Legacy-v3 remains 3.1.5; latest published 10.x remains 10.2.6. Node requirement for 11.0.4 is `20 || >=22`. | Node 24 is compatible, but consumers' declared/API contracts are not. Need supported fixes/backports on required majors or consumer releases adopting a fixed major. |
| ESLint | Installed 9.39.5 equals registry `maintenance` tag. Latest 10.14.0 requires Node `^20.19.0 || ^22.13.0 || >=24` and still depends on minimatch `^10.2.6`. | Node is adequate, but major upgrade would not remove this advisory. Existing import/a11y/React plugin peer ranges exclude ESLint 10. ESLint 9's prior install support warning remains tooling debt; the maintenance tag alone is not a support guarantee. |
| `@eslint/config-array` / `@eslint/eslintrc` | Latest 0.23.5 still requires minimatch `^10.2.4`; latest eslintrc 3.3.7 requires `^3.1.5`. | Need fixed compatible minimatch dependency or upstream API migration, not a forced transitive major. |
| `eslint-config-next` | Latest advanced from 16.4.4 to 16.4.5 during review; it permits ESLint `>=9`, but retains affected plugin families and TypeScript ESLint `^8.56.0`. | A config patch alone does not remove affected paths. No security benefit established here to justify changing matched runtime/config 16.4.3 solely for this finding. |
| TypeScript ESLint | Latest 8.72.1 permits ESLint 8.57/9/10 and TypeScript `>=4.8.4 <6.1.0`, but typescript-estree still requires minimatch `^10.2.2`. | Compatible family patch exists, but does not address this advisory; no unrelated refresh performed. Need a fixed allowed minimatch version or supported consumer adoption. |
| import / jsx-a11y / React plugins | Latest 2.32.0 / 6.10.2 / 7.37.5 equal installed versions; each still requires minimatch `^3.1.2`, with ESLint peers capped at 9. | Need compatible minimatch fix or coordinated plugin API/peer updates. |

Installed React/import/accessibility plugin source actually calls minimatch as a
default/CommonJS function. The 11.x documentation uses the named `minimatch`
export; forcing 11 over a 3.x dependency risks runtime failures as well as
violating declared ranges. No shim or forced major override was added. npm's
suggested ESLint 4.0.0 / Next-config 0.2.4 downgrades are not acceptable fixes.
No supported advisory-removing update was established for these current paths.
Track upstream backports/adoption and re-evaluate on future releases; residual
risk remains documented rather than declared resolved.

## Existing override and earlier remediation

The sole override remains `prisma -> mysql2: 3.24.6`. Installed Prisma CLI,
Client and PostgreSQL adapter are aligned at 7.10.1. Prisma 7.10.1's published
manifest pins mysql2 **3.24.4**; the scoped override resolves **3.24.6**, which
matches current stable mysql2. Retain the narrow same-major patched transport
resolution rather than silently reverting it. Historical tracked advisories were
[GHSA-3f6p-5ww8-9rcr](https://github.com/advisories/GHSA-3f6p-5ww8-9rcr)
(authentication downgrade) and
[GHSA-rgwj-5xj2-c3m3](https://github.com/advisories/GHSA-rgwj-5xj2-c3m3)
(compressed-protocol inflate DoS). Neither is reported against the current
resolved tree. Reassess removal when a supported Prisma release supplies an
equivalent patched dependency and clean installation/generation/baseline pass.
The application uses PrismaPg/PostgreSQL, not a MySQL connection workflow;
no MySQL protocol functional test is claimed.

Earlier transitive fixes are already committed in the inherited lockfile:
deepmerge-ts 8.0.2, fast-uri 3.1.9 and zod 4.6.7. Installed graph and lock metadata
agree; integrity hashes are recorded. Existing dependency-security unit tests
cover recursive graph merging, URI validation and bounded Zod array errors.
The old deepmerge/braces/nine-entry narrative is not the fresh audit result.
Their historical advisory text is not silently relabelled as current findings.

## Checks run versus reused

Newly executed in R2: both audits with exit statuses, `npm ls --all --json`,
targeted `npm ls` dependency paths, registry `npm view` release/peer/engine/API
inspection, lockfile dev/integrity checks, source usage inspection and documentation
whitespace/scope review. The official minimatch 11.0.4 tarball was inspected via
`npm pack --ignore-scripts` into `/tmp` (source/README only, no installation or
execution) to verify the named CommonJS export. All advisory/registry retrievals
succeeded. Session-local
raw evidence: `/tmp/lend-r2-before-{full,prod}.json`, `/tmp/lend-r2-paths.txt`,
`/tmp/lend-r2-installed-tree.json`, and `/tmp/lend-r2-*-upstream.json`.
November 4 refresh: `/tmp/lend-r2-final-{full,prod}.json`.

**Reused R1 evidence, not rerun:** clean `npm ci`, Prisma generation, complete
type generation/typecheck, lint, 202 unit tests, owned baseline (33 migrations,
76-table snapshots and intentional-failure cleanup), and full `build:verify`
all passed as recorded in `SETUP_REPEATABILITY.md`. The R1 source implementation
is commit `8104170b0aaabcec9413abef93811ee708305cff`, inherited by the starting
checkpoint. Repeating application/database/browser suites for this docs-only
disposition would not test changed executable behavior. No database was created
or accessed, and no dependency installation was repeated in R2. Fresh npm audit
does not replace those functional checks.

## R2 completion and R3 handover

R2 disposition is complete: fresh counts, paths, release assessment, retained
override rationale and remaining advisory/upstream conditions are explicit.
It is **not** a zero-advisory result. Review and commit only this report and
the README summary; normal push only this recovery branch, then independently
query the remote SHA. A local commit or push output alone is not backup proof.

R3 restores original Prompt 3/D's strict booking timestamps and configurable
policy. Read the current booking parser/form/API and recovery requirement map;
separate Taipei wall-clock form conversion from explicit-offset API instants,
add real-calendar/configuration/boundary coverage and a post-lock future check
without breaking durable replays. Resolve the fixed 90-day versus configurable
30-day default product decision before changing policy. Preserve exact Decimal
pricing, overlapping-pending/acceptance reservation rules, evidence workflows,
R1 ownership/setup safeguards and all provisional feature gates. Historical
timestamps remain unchanged; R2 authorizes no reconstruction beyond dependencies.

## Prompt 2/C acceptance recheck — 2026-11-04 (Asia/Taipei)

Reverified from clean local/remote `b532e0348c219fd78a8f04dfa95bfc3eaad569c9`.
Fresh full and production audits again retrieved successfully: full exit 1,
16 moderate package entries from **one** distinct GHSA-g3hv-75wg-m249 advisory;
production exit 0, zero findings. All installed paths, versions and dev flags
still match the inventory above; `npm ls --all --json` exits 0.

Fresh upstream checks again find ESLint 10.14.0 using minimatch ^10.2.6,
config-next 16.4.5 retaining affected plugin families, typescript-estree 8.72.1
using ^10.2.2, and latest import/a11y/React plugins still using ^3.1.2 and
excluding ESLint 10 peers. No 3.x/10.x compatible fixed release was found;
11.0.4 is current latest. Node compatibility alone does not establish API/peer
compatibility. Prisma 7.10.1 still pins mysql2 3.24.4, while installed override
3.24.6 equals stable latest. Retain the override and prior transitive fixes.

No dependency, application, setup, lockfile or lint-rule changes were justified.
Remaining development/CI exposure and upstream follow-up conditions above remain
valid; this is a disposition acceptance, not a clean-advisory claim. README's
November 4 summary remains current. `STABILIZATION_RECHECK.md` now appends the
requirement/evidence acceptance matrix and Prompt 3/D handover.

Newly executed: audits, targeted/full dependency graph, lock/dev classification,
current upstream metadata and actual usage inspection. Reused explicitly from
the recent **Prompt 1 recheck**, not newly executed: clean installation,
generation, full typing, lint, 202 units, baseline and initialized full build.
No new database work or broader functional suites were needed for docs-only
changes. The empty-schema build failure remains a separate open difference.
Raw audit/tree evidence: `/tmp/lend-p2-recheck-*`. Executable metadata/source
was checked unchanged from `be75415`; no installed dependency was replaced.
