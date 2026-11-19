# Development history

Git dates below are author dates as recorded by Git. Historical reports use their own stated test dates and environments. Main is canonical, and branch ancestry does not imply rollout or release approval.

| Period | Milestone and evidence | State at audit |
|---|---|---|
| Oct 1–6 | `bf94f9a` Next scaffold, `51c0169` marketplace MVP, `660885b` persisted rental lifecycle backbone. | Canonical foundation. |
| Oct 12–13 | `87fa20b` marketplace and trust UI, `18529a3` rental completion workflows, Admin and moderation. PR #1's advertised head is the latter commit. | Content reachable from main. PR metadata unavailable. |
| Oct 16 | `a02293d` official MRT selection, `7a4dc60` locking/regressions, `f856dc3` / `b702a44` merge history. | `f856dc3` remains the rollback tag. Current schema includes later additions. |
| Oct 19–23 | `0f5c9dd` replay/evidence hardening. `f9ae3a6` private chat/moderation, `fcd369a` shadow analysis, `74c726e` opted-in meetup receipts and `88af673` timing separation. `cf215e0` temporary location isolated. | Phase separation and chat gates remain. Meetup enrollment later became mandatory for new rentals. |
| Oct 23–24 | `98d24a9` Control Center, `1204aea` staff capability contracts, `c51812b` staff identity, `9998e5b` session/audit foundations, `ce9ad9d` independent approval persistence, `f35a33b` WebAuthn, `da63004` Admin pilot, `ff7b2b6` scoped listing reads and `ca2d374` own-session overview. `fe83e27` adds workbench, `fec839b` case history. | Core Admin coexists with candidate authority. Production staff rollout remains gated. |
| Oct 25–26 | `1d921d2` read-only Support, `86eef8c` ticket intake, `00eb14d` private channels, `4995595` scoped assignment/replies. `df37580` geofence lab. `27bbcb3` announcements and `94eee81` typed settings. `b915e75` logout polling repair. | Owned candidates and supporting persistence integrated. |
| Oct 26–27 | 11A design `a7e1929`, materials R1 `95238a5`, 11B shared marketplace `5d7101a`; locale rollout `19833cc` and `1866016`. `b5bd093` and `14430fa` authenticated password change and guard refinement. | Partial bilingual coverage and review-gated visual expansion. Password change and password reset remain distinct. |
| Oct 27–28 | Case Brief synthetic `cf67562` then offline `bf14fe8`, experiment prep `ffb40f7` and offline review `008acb7`. `02d3669` scoped Support companion. | Audited fixtures and contracts. Live experiment and human quality evidence remain open. |
| Oct 28–29 | `fa5b3e3` inspection preview, `13b1143` synthetic identity, `3b5c964` documentation preview, `c3bbfed` durable Studio, `847a947` prospective agreement, `a6c8705` durable claims and `b9297ff` recovery coordination. | Development gates. Stronger persistence does not grant real identity, custody, delivery or financial authority. |
| Oct 29–31 | `b20f638` loopback Ollama, `fd6c63a` Qwen contract behavior, `34c0c72` fictional playground, `396762e` controlled eval runner, `c459e02` grounding, `ef77a9c` synthetic Support handoff, `1e85a4f` fixture Vision, `9615cc6` translation mock, `8d2b32d` Vision-first adapter. | Bounded experiments. Real local model and hosted provider validation are unresolved. |
| Nov 2 | Consolidation merges `86113ab` and `f1d4952`, app/navigation fixes, upgrade fixtures, `0d88f4c` audit, `87459cb` mandatory bilateral GPS/QR, `cf61149` stabilization. | Current main includes this line. Separate QR audit `3d8dd73` describes an older checkout. |
| Nov 3–4 | `8104170` repeatable setup and owned regression, `de79da9` explicit instants and replay-safe limits, `0e8bd63` MVCC evidence, `f8c602c` timestamp provenance, `6b477c4` participant booking history. | Canonical. Historical provenance is still an operational decision. |
| Nov 5–6 | `f4f0bdd` UTC and isolated harness, `21ad506` compiler isolation, `711810a` startup and navigation diagnostics, `fc4bf60` hydrate-error rejection, `77aae95` Mission 5 closeout. | Latest canonical stopping point. Tests surface the underlying failure. Release acceptance remains blocked. |
| Nov 9–14 | Branch-only recovery `d760ab3`; canonical-based adaptation `5b3a1d6`, request/reset UI `0517551` / `0dee5cd`, acceptance WIP `7700f45`. | Latest advertised substantive development is recovery integration. Step 3 source is missing. The branch documents UI approval for Steps 1 and 2. |

## Canonical stopping point

[Mission 5](../audits/operation-new-features/MISSION_5_HYDRATION_ROOT_CAUSE.md) is the latest reachable closeout. On the tested Windows cohort, it links a matching standalone Next failure to development invalidation between router initialization and client hydration. The test guard now rejects captured hydration errors. Webpack acceptance remained failing in reported cohorts, Turbopack had bounded passing cohorts, and a separate subprocess startup and RSC settling issue remained. Linux and owner-device acceptance did not follow from that work. The evidence supports a development-runtime defect in the tested ordering. Exact production scope remains unknown.

The [WIP recovery checkpoint](BRANCH_AUDIT.md) is later than canonical stabilization and holds independent unfinished work. It does not supersede the canonical baseline. The owner confirmed rental acceptance first during this audit.

## Recent canonical commit sequence

```text
77aae95 2026-11-06 docs: record Mission 5 hydration causal evidence and acceptance
fc4bf60 2026-11-06 test: reject captured hydration failures in rental acceptance
7feef31 2026-11-05 docs: record Mission 4 startup and hydration investigation
711810a 2026-11-05 test: diagnose startup timing and settle rental navigation
97d53fd 2026-11-05 docs: record Mission 2 baseline acceptance and unresolved gates
0765647 2026-11-05 test: isolate meetup compiler lifetimes and record HMR subscriptions
d924b54 2026-11-05 docs: record conditional Turbopack Mission 1 findings and controls
21ad506 2026-11-05 Isolate owned rental compiler outputs and improve HMR diagnostics
a073fe9 2026-11-05 docs: record final baseline acceptance blockers and evidence
434aa18 2026-11-05 test: correct acceptance database labels and cover homepage navigation
d89b6a2 2026-11-05 docs: plan controlled parallel development and acceptance gates
2c8e835 2026-11-05 docs: record Mission 0.2 browser acceptance closure
f02f2d7 2026-11-05 test: scope pending RSC streams to the active document
20b021d 2026-11-05 test: retain development navigation timeout state
370d338 2026-11-05 Serialize unit files while retaining bounded security subprocess checks
a55732f 2026-11-05 Include queued navigation events in the readiness quiet window
2e120e2 2026-11-05 Wait for prior development transitions before rental browser navigation
482f279 2026-11-05 Recover valid QR patterns within the bounded camera frame budget
4e28573 2026-11-05 Fix review hydration and development browser acceptance sequencing
3ff7ddd 2026-11-05 Document stabilization evidence and remaining browser acceptance blockers
f4f0bdd 2026-11-05 Stabilize UTC sessions, review file safety and isolated regression harness
6b477c4 2026-11-04 Group participant booking history and verify full lifecycle navigation
f8c602c 2026-11-04 Assess historical timestamp risk with synthetic timezone provenance tests
0e8bd63 2026-11-04 Verify booking reservation boundaries, real MVCC retries and atomic cleanup
3def2e5 2026-11-04 Unify rental history displays with strict Taipei instant formatting
```

## Historical evidence

- [Fourteen-stage roadmap](../roadmap/MASTER_ROADMAP_14_STAGES.md) records the staged product plan. Confirm current source and gate decisions before treating any stage as rolled out.
- [Final baseline acceptance](../audits/operation-new-features/FINAL_BASELINE_ACCEPTANCE.md), [Mission 2](../audits/operation-new-features/MISSION_2_BASELINE_ACCEPTANCE.md), [Mission 4](../audits/operation-new-features/MISSION_4_STARTUP_HYDRATION.md) and [Mission 5](../audits/operation-new-features/MISSION_5_HYDRATION_ROOT_CAUSE.md) show the difference between repeatable setup, development acceptance and actual product sign-off.
- [Branch audit](BRANCH_AUDIT.md) records advertised refs, patch comparison and GitHub metadata limits. The history is reconstructable from Git and tracked reports. Remote Actions status, off-repo approvals and deployed state were unavailable.
