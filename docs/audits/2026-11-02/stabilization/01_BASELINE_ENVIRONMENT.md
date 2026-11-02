# Stabilization 01 — baseline and environment

Assessment: **PARTIAL** (2 November 2026). The candidate, Linux prerequisites, and preliminary checks are working. macOS browser setup and the separately reported uncommitted changes cannot be verified from this environment. This is not product, physical-device, or deployment acceptance.

## Source and ancestry

- Candidate: `/workspace/lend-ya-stabilization`, branch `stabilization/baseline-20261102`, HEAD `87459cbc169bc47b3fba2ef1e51577c4ef6968c9`, created from remote `fix/mandatory-rental-meetup-integration` at the same SHA. That branch still pointed there when queried. It contains the mandatory integration and is the requested suitable starting point, subject to subsequent review and acceptance.
- `88af673e46603854006affee8e3dd783d5e14584` is an ancestor of `87459cbc`; `git merge-base --is-ancestor 88af673 87459cb` returned 0. The published audit's statement that the exact owner revision is not an ancestor is contradicted by the fetched commit graph; its 155-ahead divergence figure reflects commits from the common ancestor. No claim is made about a different uncommitted owner checkout.
- Audit `3d8dd73437e3290459b3ef4ef228492cd447d131` has parent `88af673`; its sole diff from that parent adds `docs/audits/2026-11-02/FUNCTIONAL_ACCEPTANCE_AUDIT.md`. It and `87459cbc` diverge at `88af673` (155 candidate-only, one audit-only commits). Neither is an ancestor of the other. The audit was read directly from `3d8dd734`; it is not present in the candidate tree.
- The published audit describes `/Users/yuiii/hustlen-mrt-contrast`, branch `fix/ui-mrt-dark-dialog-contrast` at `87459cbc`, with uncommitted selector/CSS/browser-test changes. **NOT FOUND locally** in this Linux environment; no such branch was advertised by GitHub. The audit is historical evidence of its reported location, not verification of its present state or content.
- Recently reported owner-handoff and `DEV_LOCATION_BYPASS` changes: **NOT FOUND** in accessible local worktrees or fetched branch history. `git log --all -S'DEV_LOCATION_BYPASS' --oneline` returned no matches. Existing generic handoff functionality and `origin/feature/qr-mrt-handoff-return` are not proof of the recently reported changes. Ask the owner for the relevant checkout, patch, or ref if needed.

## Worktrees and outstanding state

Inventory covers the accessible `/workspace` checkout and the newly cloned repository, not the owner's Mac or other machines.

| Worktree | Branch / HEAD | Status |
|---|---|---|
| `/workspace/lend-ya` | `work`, `f856dc360b332007dd79725ddee0d28102411521` | Clean (`git status --short --branch`); no stashes. Existing checkout untouched. |
| `/workspace/lend-ya-stabilization-repository` | `main`, `f856dc360b332007dd79725ddee0d28102411521` | New `git clone --no-checkout` repository; index reports tracked files deleted because no checkout was requested, not pre-existing user deletions. No stash. Serves as the candidate's independent Git store. |
| `/workspace/lend-ya-stabilization` | `stabilization/baseline-20261102`, `87459cbc169bc47b3fba2ef1e51577c4ef6968c9` | Initially clean; this audit is the only untracked source file. Dependencies, generated client and test artifacts are ignored. |

The audit also recorded owner Mac worktrees `/Users/yuiii/p2p-marketplace` and `/Users/yuiii/hustlen-qr-phone`, and a Mac stash named “Save local package-lock before MRT preview”. These are not accessible or independently verified here. No existing worktree, stash, database, migration or security gate was reset or modified.

## Environment and commands

Linux x86_64, Node `v24.19.0`, npm `11.9.0`; no `.nvmrc` was found. Commands below ran in the candidate unless stated. Results are from this run, not the published historical results.

| Command / check | Exact result |
|---|---|
| `git ls-remote --heads origin` | Exit 0; remote mandatory ref `87459cbc169bc47b3fba2ef1e51577c4ef6968c9`, audit ref `3d8dd73437e3290459b3ef4ef228492cd447d131`, temporary-local-meetup ref `88af673e46603854006affee8e3dd783d5e14584`; no UI contrast branch advertised. |
| `git clone --no-checkout ... /workspace/lend-ya-stabilization-repository` and `git worktree add -b stabilization/baseline-20261102 /workspace/lend-ya-stabilization 87459cb` | Both exit 0. Clone is separate from existing Git storage. |
| `npm ci --no-audit --no-fund` | Exit 0; 573 packages added in 21s; warning that ESLint 9.39.5 is no longer supported. Lockfile unchanged. |
| `npx prisma generate --config prisma7.config.ts` | Exit 0; Prisma Client v7.10.1 generated under `node_modules/@prisma/client`. |
| `ffmpeg -version`, `ffprobe -version` | Both exit 0; each version `7.1.5-0+deb13u1`. Already installed. |
| `chromium --version` | Exit 0; Chromium `154.0.8037.57` on Debian Linux. |
| Playwright `chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']})`, create page and set title | Exit 0, printed `title: smoke`. Browser process smoke only; not an application journey or macOS verification. |
| Docker local socket check and `docker image ls postgres` | Exit 0; Docker server `28.4.0`, existing `postgres:17` image. |
| `docker run -d --rm --name hustlen-stabilization-postgres-01 -e POSTGRES_PASSWORD=... -p 127.0.0.1::5432 postgres:17` | Exit 0; isolated temporary container, host port `127.0.0.1:32768`. `pg_isready -U postgres` exit 0, accepting connections. Uses only a disposable local credential; no persistent volume or external database. Container remains running for this session; removal destroys its data. |
| `npm test` | Exit 0; **202 tests passed, 0 failed**, 0 skipped. |
| `npx tsc --noEmit` | Exit 0, no output. |
| `npm run lint` | Exit 0, no diagnostics. |
| `MRT_TEST_DATABASE_URL=postgresql://…@127.0.0.1:32768/hustlen_test_stabilization_01 npm run test:rental-api` | Exit 0; 33 migrations applied to newly created runner-owned database; **13 tests passed, 0 failed**, 0 skipped. Runner reported removal of its owned database and recorded uploads. The maintenance connection was to the isolated container's `postgres` database solely to create/drop its marked test database. |

Full command output for test runs was captured under `/workspace/scratch/stabilization-{unit,tsc,lint,rental}.log` in this environment. The runner verifies the local target and ownership marker before use and cleanup. No existing application database was used. Test artifacts are ignored in `.test-artifacts/`.

## Changed files and unresolved risks

- New untracked report: `docs/audits/2026-11-02/stabilization/01_BASELINE_ENVIRONMENT.md`. No tracked application files changed, no migration changed, and no commits, pushes, merges or deployments were made. `node_modules`, generated client and runner artifacts are local ignored files.
- macOS is not available: Playwright's macOS browser executable and path overrides (`MRT_BROWSER_PATH` / `CHROMIUM_PATH`) must be installed and verified on the target Mac; Linux Chromium success does not certify that setup. FFmpeg and ffprobe availability on that Mac also remains unverified.
- The separately reported UI fix, owner-handoff work and `DEV_LOCATION_BYPASS` require an accessible source and review before any integration. The candidate does not contain the published audit commit, which remains accessible on its remote branch; do not silently merge it.
- Local disposable container and its port are session-scoped and may disappear; repeat with a fresh container and uniquely named test database. No physical phone, onsite GPS, production server or production database was tested. Broader browser, QR-camera, upgrade and acceptance testing remains outstanding.
