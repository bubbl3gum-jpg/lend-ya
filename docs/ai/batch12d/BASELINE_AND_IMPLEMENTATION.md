# Baseline and implementation contracts

Clean starting branch `feature/model-experiment-preparation-batch-12c`, final documentation HEAD `7be0a59ffe590e1ede373940087fe6ee541b2860`. Verified both supplied ancestors: tested implementation `ffb40f788d5d2fe0ec91166c809593061803f582`, closeout `63b34e036974c00bf105919930fd5d38f347a4bf`. New branch `feature/offline-ai-quality-review-batch-12d`.

Read 12B/12C final reports, typed contracts, service, validator, manifest, evaluation and rubric, approval checklist, preparation/hint limitations and canonical Stage 10 dependencies. Existing 16 scenarios are in `lib/ai-case-brief/evaluation.ts`; pinned 16-task corpus in `experiment.ts`; dimensions/hints in `quality.ts`; UI notebook `components/admin/ai-case-brief.tsx`. Existing route/session/development gates and source selection unchanged. No application UI change, design redesign, audio, particles, schema, migration or dependencies.

| Source | Responsibility |
| --- | --- |
| `lib/ai-case-brief/review-corpus.ts` | Separate fixed synthetic supplement; exact schema and language pairs, per-source hash, authored boundaries. Not imported by routes. |
| `lib/ai-case-brief/review-packet.ts` | Trusted original+supplement snapshots via existing offline service, structural/hint separation, snapshot/packet digests; blank scores, readable packet and strict review validator. No transport, credentials, DB or live adapter. |
| `scripts/offline-ai-review.ts` | Explicit local prepare/validate operations; exclusive owner-only files, bounded regular-file import, summary-only errors/output. No imported approval or persistence into application. |
| `tests/ai-review.test.ts` | Reproducibility/hash/no-egress, snapshot binding, invalid/forged files, attribution limitations and actual local CLI behavior. Completed-looking synthetic test input is test-only, never genuine review evidence. |

Files cannot prove identity or honest scoring. Retention/access/independence must be agreed before collecting actual reviewer identities; aliases avoid unnecessary personal data. No auto-scoring or fabricated human reviewer/time exists in the supplied packet. Existing notebook local acknowledgment still is not a score. All ten decisions remain unresolved and no financial cap is claimed.
