# Batch 13F — Local AI Customer Service pilot review

29 October 2026, Asia/Taipei. **Implementation candidate; genuine local-Qwen acceptance is blocked, not complete.**

## Revisions and baseline

Branch `feature/local-ai-customer-service-batch-13f`.

Clean starting HEAD `f6a4dfb43f85eb72a442ee317dbce48ae45e558c`; requested13E implementation `b9297ff86f09482ddfef2937a5dd9daff10ba440` and evidence `7a986c96ab4bde7325fd71479b44987495162d7c` are verified ancestors.

Implementation: `b20f638cbaaa6e538a296d43f4d981a5ba0a0769`.

Evidence closeout: **707071607f3460a8ffc2634a06cce938da6a3877**, indexed by a later documentation-only commit.

Nothing pushed, merged or deployed. No existing application database changed.

## What works in the candidate

The existing `/dev/support-companion` now optionally shows a local-inference panel, while original GUIDE and assigned-channel COPILOT remain offline and unchanged. Select a fixed synthetic task, request generation, compare source-linked advice, edit English/Traditional Chinese drafts locally, cancel or reject. No send/accept/settle/charge action exists. Heritage styling, existing locale/theme/preferences and responsive shell are reused without new artwork, sound, particles or a redesign.

The new server gateway supports only exact local Ollama with explicitly allowed9b/4b identifiers. It sends bounded synthetic inputs through numerical loopback Node HTTP, with no proxy/redirect/provider/browser-direct path, one in-flight request per process, rate limits, timeout and abort handling. No tool call path. Closed output validation checks shape, limits and case-local source references; thinking/raw provider fields are omitted. Before release, account/session is rechecked. Production refuses independently even with the local flag configured.

Existing32 bilingual manifests remain pinned, plus two separately authored camera-return/charger-dispute tasks. The real Support copilot's permitted private messages/events NEVER enter inference. No browser text, account/booking ID or endpoint can substitute for a catalogue selector. Actual database reads in this path are only the existing ownership/runtime/session checks, not case retrieval.

## Acceptance limitation — actual model unavailable

This execution environment is Linux x86_64, without an Ollama executable or listener at127.0.0.1:11434. The owner confirmed their Mac is available, but no Mac terminal/execution tool is attached to this session. A Mac's localhost is not this workspace's localhost. No tunnel, LAN endpoint, substitute Linux model, model download, external request or paid API was used.

Consequently, genuine Qwen9b/4b results, model latency/token/resource observations, model failure/accuracy analysis and human bilingual judgments are **unavailable**. There are no real-model screenshots. The committed browser screenshots show the real application with an explicitly mocked loopback daemon; their response text/timing/token counts are test data. They prove interaction/layout, not Qwen behavior. No human scores, reviewer identity, review dates or approval were fabricated.

A separate `test:local-ai-real` command is implemented for the Mac: fresh owned database/restricted runtime, native browser login, actual application inference, exact result capture and cleanup. It has no mock fallback and has NOT run here. The optional CLI supports all34 tasks through the guarded application routes after its owned pre-authentication check. See the setup instructions; these commands do not confer production authority.

## Review evidence and deliverables

1. [Baseline, reuse audit, gateway design and boundaries](batch13f/ARCHITECTURE_AND_BOUNDARIES.md).
2. [Exact changed-file inventory](batch13f/CHANGED_FILES.md) and [implementation source hashes](batch13f/implementation-source-hashes.json).
3. [Owned Mac setup, genuine smoke/evaluation and cleanup](batch13f/SETUP_AND_REAL_EVALUATION.md).
4. [Actual verification ledger](batch13f/VERIFICATION.md), [machine command results](batch13f/final-results.json) and [initial failures](batch13f/initial-failures.json).
5. [Real application screenshots — MOCK transport](batch13f/SCREENSHOTS.md), [browser evidence](batch13f/browser-evidence.json).
6. [Catalogue/source validation](batch13f/catalogue-validation.json);34 manifests, no real model results or human scoring.
7. [English/Traditional Chinese and safety evaluation status](batch13f/EVALUATION_STATUS.md); original six-dimensional rubric/32-task review packet preserved.
8. [Preservation](batch13f/preservation.json) and [owned cleanup](batch13f/cleanup.json).
9. [Genuine camera pickup](batch13f/camera-pickup.json) and [return](batch13f/camera-return.json) from the unchanged full meetup suite. These are camera/QR evidence, not AI measurements.

## Security/privacy and remaining blockers

This implementation does not certify factual correctness, translation quality or prompt-injection resistance. Valid citations can support the wrong claim; model text can still contain unsafe promises. No such text gains application authority. Original rental, case, evidence, QR/camera/GPS/consent, notification/deadline, staff/MFA and Support guards remain unchanged. New history, proposal, custody, money, production roles or delivery state is not written.

Actual Mac execution, model/runtime/license verification, cancellation/unload/memory observations, genuine32-task bilingual evaluation and human review are required. Configure the daemon itself for loopback, one parallel generation and bounded queue; process-local app limits do not certify GPU cancellation or multiple-process coordination. Runtime/OS logs and retention need owner review. No real private data is authorized.

Future hosted-provider compatibility is an interface seam only; no hosted adapter, credential loader, billing path or external egress switch is implemented. A separate authorization/privacy/cost/security review would be required. Stage11 remains inactive.

The canonical fourteen-stage roadmap is preserved. Stage10 remains In Progress; unfinished Stage6 station controls, Stage7 Support/delivery policies, Stage8 publishing/settings and Stage9 visual acceptance remain unchanged. Stop at this candidate for review. Do not call Batch13F's real-inference success criterion met until the genuine Mac run and review are available.
