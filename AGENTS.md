<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Hustlen’ UI/UX work

For Batch 11A and all subsequent user-facing or Admin UI changes, read and follow [the mandatory Balanced Agricultural Luxury design contract](docs/design/HUSTLEN_UI_UX_DESIGN_CONTRACT.md) and [the reusable foundation](docs/design/EDITORIAL_FOUNDATION_BATCH_11A.md). Scope initial adoption to the approved account/shared-shell slice; wider marketplace rollout requires product-owner visual approval. Preserve the original 14-stage roadmap and all unfinished Stage 6–8 gates.

Batch 11A-R1 refines this system using the supplied owner reference. Read [the material/interaction foundation](docs/design/MATERIAL_AND_INTERACTION_FOUNDATION_R1.md) for the scoped account/catalogue candidate, original assets, System appearance and independently controlled motion/sound. Batch 11A was not visually accepted; R1 also needs explicit owner review before wider rollout.

Batch 11B explicitly authorizes narrow integration of the provisional R1 foundation into the real homepage, Browse entry/filter and shared marketplace navigation. See `docs/design/batch11b/HOMEPAGE_NAVIGATION_AUDIT.md` and the Batch 11B review. This is not final visual approval or authorization for another aesthetic redesign, Admin redesign or operational behavior change.

Batch 11C adds scoped English/Traditional Chinese localization for the homepage, shared marketplace navigation and Account Settings. Use the typed catalogue and server cookie locale in `lib/i18n`; preserve unsaved forms and independent appearance/sound/effects preferences. See `docs/design/batch11c/LOCALIZATION_POLICY_AND_COVERAGE.md`. Other page bodies remain English; do not imply full-site translation, working password recovery or product-owner visual acceptance.

Batch 11D authorizes scoped bilingual discovery on real Browse/category filtering and public listing details, reusing the provisional system. Use `lib/i18n/listings.ts` only for exact display mappings; preserve raw query/filter values, unknown user data and server visibility. Rental quotation/station picking/private messaging remain explicitly English operational workflows; activity/trust record bodies remain English. See `docs/design/batch11d/LOCALIZATION_COVERAGE.md`. Password change/recovery is proposal-only; no Stage 10 AI or wider visual approval.

Batch 11E implements password change only behind its verified owned-development gate for exact allowlisted ordinary accounts. Read `docs/design/batch11e/SECURITY_ARCHITECTURE_AND_POLICY.md`. Reuse existing hashing, the shared credential-snapshot session issuance lock and atomic credential/session/event transaction. Never activate recovery, notifications, staff/Admin/reviewer password changes, mandatory MFA or production writes from this candidate. Preserve keyboard-selectable name drafts while disabling Save after revocation. Stage 9 remains In Progress.

Batch 11F reviews and narrowly hardens the 11E candidate: reject effective password reuse through existing verification, require stored credential and exact security-event postconditions within the transaction, and retain all-session revocation. Read `docs/design/batch11f/SECURITY_SOURCE_REVIEW.md` and `AUTHORIZATION_BOUNDARY_AND_TRANSACTIONS.md`. Session revocation denies new requests but is not universal cancellation of already-authorized operations. Reuse local password visibility and field/server feedback focus without persisting credentials. Historical overlapping login intermittence remains unresolved. Stage 10 planning may be proposed with synthetic/read-only designs; no AI implementation, production activation or visual approval follows.

Batch 12A explicitly authorizes only the gated synthetic/scripted Case Brief notebook at `/admin/ai-case-brief` and future Stage 10 planning. Read `docs/ai/batch12a/PRODUCT_AND_WORKFLOW.md` and `READ_ONLY_INTEGRATION_AND_12B.md`. All sample sources/outputs are authored synthetic fixtures, not inference; local review/drafts neither persist nor send. Production is refused independently of the flag. Do not connect a provider, live Support/messages/evidence, activate roles or implement Stage 11 automation. Actual model-backed 12B requires separate approval. Preserve Stage 6–9 production and visual blockers.

Batch 12B authorizes offline-only server integration at `/api/admin/ai-case-brief`, exact synthetic manifests and deterministic contracts/evaluation. Read `docs/ai/batch12b/CONTRACT_AND_BOUNDARIES.md`. No credentials/provider/SDK or real records are approved. The browser imports only contract types and requests closed fixture selectors; exact excerpt matching is not fact verification, and interpretations remain human-reviewed. Preserve previous valid drafts separately on failed attempts, sequence/abort fencing and production refusal. The first live synthetic experiment requires every decision in `LIVE_EXPERIMENT_DECISIONS.md`; flags/API keys are not approval.

Batch 12C is non-egress experiment preparation only: all ten live-model approvals are missing. Read `docs/ai/batch12c/APPROVAL_CHECKPOINT.md` and `DATASET_AND_RUBRIC.md`. The offline corpus/heuristic report is not actual model quality; human scores remain null, local acknowledgment is not scoring, and dry-run budget arithmetic never grants egress. No provider/SDK/credentials or approval-file activation path. First genuine model execution requires separate explicit owner decisions, reliable hard-cost controls and a separately reviewed adapter.
