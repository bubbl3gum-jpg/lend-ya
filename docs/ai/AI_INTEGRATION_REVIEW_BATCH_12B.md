# Hustlen’ — Batch 12B offline AI integration review

27 October 2026 · Stage 10 — AI Assistant, Stage 1 · offline synthetic candidate only.

Branch: `feature/synthetic-ai-integration-batch-12b`.

- Tested implementation: `b921a3c36120ac3fd711a940e61125cf5d0c2eb0`.
- Core service/UI implementation: `bf14fe83f66cbbc529b824e3ea51589133f0cb9a`; final tested revision above adds only the exhaustive disabled-route test correction.
- Evidence closeout: `8762bfd86403fa316cb45f7366e419d920ee47d8`.
- Clean baseline HEAD: `993967f4363a4a1218ac9be978e844f6ee182158`; verified ancestry from 12A implementation `cf67562c6df99ea486aa354f24db5ea52305d34d` and evidence `b542b54d73bb0cdb0110bb08dce3eb116fa36a59`.

## Implemented, not just proposed

A real authenticated same-origin Case Brief service now replaces client-side authored answer selection. It builds one bounded selected-case manifest, invokes a deterministic adapter through a reusable interface, parses/validates strict versioned output and exact source references, and renders structured results in the existing notebook. The browser receives directory metadata and only the selected source snapshot; it no longer imports all source/answer fixtures.

Every result says **“Simulated — no AI model was called.” No real-model adapter, external call, provider credential activation, purchase, SDK or customer-data processing was authorized or performed.** Environment keys/flags cannot select a live provider. No model quality, prompt-injection resistance or independent security certification is claimed.

[Typed service/input/output and privacy boundaries](batch12b/CONTRACT_AND_BOUNDARIES.md) · [evaluation and human workflow](batch12b/EVALUATION_AND_HUMAN_REVIEW.md) · [actual 16-scenario evaluation](batch12b/evaluation.json).

Eight synthetic source cases cover original scenarios plus conflicting dates, accusations, mixed-language material and noisy history; sixteen evaluations add fabricated citations, malformed input/output, unsupported language, outage and timeout. Validator rejects foreign IDs, false excerpt attestations, wrong case/language/version, unknown role/action/tool fields and invalid bounds. Exact source excerpt is still a claim, not a verified conclusion. **A resolvable citation cannot prove an interpretation is true**; the explicit contradictory-interpretation test documents structural acceptance only as unverified/human-reviewed. There is no command or administrative executor.

## Real notebook behavior

Pending, validation/reference failure, unavailable adapter, timeout, limit, cancellation and actual session expiry are distinct states. An unsuccessful new attempt preserves the prior valid draft under a separate label with review disabled; success replaces an edited draft only after confirmation. New requests/results and edits invalidate acknowledgment. Sequence/deadline/abort cleanup prevents stale results from replacing current state. Sources from a previous selection are hidden while its replacement loads.

The provisional heritage materials/Admin shell are preserved; 30 typed UI translation pairs added (298 total), en/zh-TW and appearance preferences retained. Draft/source language remains explicit on language switch. No particles/audio or wider redesign. [16 responsive/state screenshots](batch12b/SCREENSHOTS.md) · [actual HTTP/browser evidence](batch12b/browser-evidence.json).

## Verification and preservation

**22/22 final selected isolated command groups pass**, **109/109 unit tests pass**, all **16 offline evaluation scenarios pass**, TypeScript/lint/Prisma validation/production build pass. Full genuine-camera pickup/return meetup passes **11/11**; original integration, meetup-session, login readiness and relevant Admin/Support/staff/MFA/account/rental/chat/localization regressions pass. Initial unit inventory and new test-code type/build failures remain separate; no deadlines or general browser-error collection were relaxed.

[Exact ledger](batch12b/regression-ledger.json) · [verification scope](batch12b/VERIFICATION.md) · [initial failures](batch12b/INITIAL_FAILURES_AND_SCOPE.md) · [setup/reproduction](batch12b/SETUP_AND_TEST_SCOPE.md) · [complete changed-file inventory](batch12b/CHANGED_FILES.md).

Actual production build/start with flag configured proves page **and API** refusal ([production](batch12b/production-refusal.json)); disabled development also refuses. Offline throwing-fetch/source-import checks and browser external-request monitoring are scoped no-egress evidence, not a universal sandbox for hypothetical future adapters. No real Support/case DB lookup occurs in the manifest/adapter path; existing own-session auth remains required. A legacy Admin session is not future authority to every case.

All changing tests used fresh owned disposable DBs. [Read-only cleanup](batch12b/cleanup.json): zero owned 12B DBs/principals remain. [76 source-preservation checks](batch12b/source-preservation.json) retain all historical migrations/schema/lockfile, legacy Admin API guards, staff/Support/chat/custody/meetup contracts. No migration, existing application DB change, staff provisioning, Support production access, setting/publishing/station/payment action, push, merge or deploy.

## Remaining decisions

[Live-experiment approval checklist](batch12b/LIVE_EXPERIMENT_DECISIONS.md): separately approve exact synthetic dataset/task/languages; provider/model/endpoint/terms; secret and egress owners; hard request/token/spend/retry/latency limits; quality/entailment/injection benchmarks and human review; retention/audit/incident responsibilities. No API-key presence or offline success constitutes approval. Future live private processing additionally requires Stage 7 exact assignment/channel/message/privacy activation. Stage 11 automation remains out of scope.

[Canonical roadmap](../roadmap/MASTER_ROADMAP_14_STAGES.md): Stage 10 stays **In Progress** for the offline foundation. Original 14 names/objectives and Stage 6–9 blockers are unchanged ([check](batch12b/roadmap-preservation.json)). Owner visual/device/security acceptance and historical R1 login intermittence remain open.
