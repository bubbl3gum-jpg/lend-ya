# Milestones 2.2 and 2.3 — intelligent moderation review

Date: 2026-10-19. Base: `feature/chat-demo-acceptance`, commit `59bbf07a3db4206dd068be885bee7bae7a5a5ef4`. Review branch: `feature/intelligent-chat-moderation`. This is a review implementation, not approval for public chat, live AI processing or deployment.

The two reported classification defects are repaired. Optional analysis is advisory, durable and disabled by default. The only database-backed worker shipped here uses a local deterministic mock. A separate cloud command accepts checked-in synthetic fixture IDs only. No external provider was contacted, no real messages were transmitted, and no existing `p2p_marketplace` database was migrated or tested. No merge, deployment, account penalty or retention deletion was performed.

## Stage A verification: deterministic rules and measurable evaluation

`lib/chat/policy.ts` now records policy `deterministic-2.2-1` on newly created messages. Existing message bodies, classifications, policy versions, cases and evidence are not reclassified or rewritten.

- Preserve the stored original body and the existing sender/idempotency/duplicate-content normalization. A separate analysis representation applies NFKC, zero-width removal, case/whitespace normalization and targeted substitutions. Only exact decoded risk-vocabulary tokens are replaced: cocaine, methamphetamine, narkoba, heroin, OTP, password, kill and seks. Spaced, dotted and hyphenated cocaine are also recognized. This is not general Unicode confusable detection or a universal spelling corrector.
- Identify a family of figurative/game contexts across the supported languages. Kindness/laughter and game/chess context can suppress a literal threat signal; explicit weapon/real-world qualifiers retain the hold. The reported kindness example is ALLOWED; `selling c0caine` is HELD. Regression examples include additional altered spellings, game contexts and a kindness phrase accompanied by a knife.
- Scope negation, reporting and educational framing to clauses rather than the entire message. Semicolons, line breaks, sentence punctuation and selected conjunctions separate clauses. A harmless warning before a separate direct threat/offer does not suppress that later risk.
- Expand explicit threats, goods/service offers, password requests and risky payment requests in English, Traditional Chinese and Indonesian. Contextual risk phrases remain FLAGGED for review rather than asserting guilt; ordinary topic discussion remains ALLOWED. Link/spam review and technical REJECTED behavior remain separate. None of these outcomes automatically changes accounts, trust scores or bookings.

### Proposed synthetic labels: easy human review

Start with [the message-by-message review table](intelligent-moderation/evaluation/LABEL_REVIEW.md). It includes every synthetic message, proposed outcome/category, actual output and a REVIEW marker for mismatches. The editable source is [v1.json](../tests/fixtures/moderation/v1.json); edit `expectedOutcome` and `expectedCategories`, record your reviewer/date/rationale separately, and rerun the evaluator. For a review without editing files, send the fixture IDs with your approved labels or corrections; keep the human-validation status pending until that review is recorded. Please review benign framing and ambiguous slang labels as well as the six misses. A FLAGGED proposal means a review signal, not a finding of wrongdoing.

The user authorized creating synthetic evaluation labels for review. These 94 labels are **assistant-proposed and not human validated**. They are not an approved labeling guide. There are 36 development and 58 separately stored held-out examples, with no repeated message between partitions. Both sets were authored with knowledge of the task/rules: the held-out set is not an independently blinded benchmark. It was not tuned after its six misses were measured. The corpus is small, intentionally risk-heavy and does not estimate real marketplace prevalence or production accuracy.

Coverage includes rentals, legitimate payment/meetup coordination, idioms/games, direct/indirect threats, harassment, goods/services, credential/payment scams, quoted/reported content, warnings, spelling alterations, spam, links, mixed languages and ambiguity. Technical invalid text has unit tests rather than being counted as a content violation in the dataset.

Reproduce without a database or network:

```sh
npm run moderation:evaluate -- --output docs/intelligent-moderation/evaluation
```

[Machine-readable results](intelligent-moderation/evaluation/evaluation.json) contain overall, per-language and per-example-group metrics, category one-vs-rest confusion matrices within each partition/language/group, four-outcome confusion matrices and the actual mismatches. Precision is TP/(TP+FP), recall TP/(TP+FN), FPR FP/(FP+TN), FNR FN/(FN+TP); undefined denominators are `null`. Binary escalation measures FLAGGED/HELD versus ALLOWED separately from category classification. Expected technical REJECTED examples are excluded from that binary measure, with actual technical-rejection counts reported separately.

Measured binary results against proposed labels:

| Policy / partition | N | TP / FP / TN / FN | Precision | Recall | FPR | FNR |
| --- | ---: | --- | ---: | ---: | ---: | ---: |
| Original `deterministic-mvp-1`, development | 36 | 24 / 3 / 4 / 5 | 88.89% | 82.76% | 42.86% | 17.24% |
| Current, development | 36 | 29 / 0 / 7 / 0 | 100% | 100% | 0% | 0% |
| Original `deterministic-mvp-1`, held-out | 58 | 17 / 3 / 11 / 27 | 85% | 38.64% | 21.43% | 61.36% |
| Current, held-out | 58 | 38 / 0 / 14 / 6 | 100% | 86.36% | 0% | 13.64% |

The original engine was independently loaded from the base revision's unchanged policy and evaluated on the same fixture texts. These are measured fixture agreements, not human-confirmed safety accuracy. Zero sampled false positives does not establish zero real false positives.

Held-out breakdown:

| Language | N | TP / FP / TN / FN | Precision | Recall | FPR | FNR |
| --- | ---: | --- | ---: | ---: | ---: | ---: |
| English | 22 | 15 / 0 / 5 / 2 | 100% | 88.24% | 0% | 11.76% |
| Traditional Chinese | 15 | 9 / 0 / 4 / 2 | 100% | 81.82% | 0% | 18.18% |
| Indonesian | 15 | 9 / 0 / 4 / 2 | 100% | 81.82% | 0% | 18.18% |
| Mixed | 6 | 5 / 0 / 1 / 0 | 100% | 100% | 0% | 0% |

Held-out category recall is 80% for THREATS (12 TP, 3 FN) and 81.25% for ILLEGAL_GOODS (13 TP, 3 FN). HARASSMENT (3 positives), PROHIBITED_SOLICITATION (4), SCAMS (7) and LINK_RISK (1) have no sampled category errors. SPAM has development coverage only; no held-out spam efficacy claim is supported. Counts and negative-class denominators are available in the JSON, not inferred from binary escalation.

All six remaining held-out mismatches are ALLOWED:

| ID | Synthetic text | Proposed review label |
| --- | --- | --- |
| held-out-055 | My cousin has snow available tonight | FLAGGED / ILLEGAL_GOODS; ambiguous slang, human label especially needs review |
| held-out-056 | You will regret this; I know where you sleep | HELD / THREATS |
| held-out-072 | 我會讓你消失，等著看 | HELD / THREATS |
| held-out-073 | 今晚有白粉，要嗎？ | FLAGGED / ILLEGAL_GOODS; ambiguous slang |
| held-out-087 | Awas, kamu tidak akan selamat malam ini | HELD / THREATS |
| held-out-088 | Ada barang putih, mau beli? | FLAGGED / ILLEGAL_GOODS; ambiguous slang |

Other limitations: irony, quoted text without recognizable framing, legal/medical/educational sale-related phrasing, longer negation scope, new slang, unseen obfuscation and deliberately misleading figurative/reporting context can still be misclassified. These rules are explainable heuristics, not full language understanding. Reporting remains available, and the mock does not repair these misses.

## Stage B: provider-independent shadow analysis

The `AnalysisProvider` interface is replaceable without giving a provider database access. It receives only current text (4,000 characters), at most two relevant preceding visible messages (500 characters each), and a listing title (120 characters): at most 5,120 UTF-16 code units before the JSON/policy envelope. Context message IDs are frozen when the message is created, from the same conversation and preceding two sequence positions. Held/rejected prior messages and later messages are excluded. No user IDs, email/account records, booking/evidence attachments or arbitrary conversation searches are supplied. Text itself can contain personal information; there is no claim of comprehensive PII redaction.

Structured output requires a supported suspected category/outcome, a nonempty explanation of at most 240 characters, 1–8 bounded reason codes, exact policy/analysis/provider/model versions and `requiresHumanReview: true`. Unknown keys, confidence values, enforcement fields, malformed JSON, unknown categories, inconsistent ALLOWED/category combinations and version mismatches fail validation. Confidence is neither stored nor presented as calibrated probability.

The mock runs current deterministic rules and explicitly says it is a synthetic test double. It exercises the plumbing; it is not an independent AI quality improvement. The optional OpenAI-compatible HTTPS adapter supports structured JSON-schema responses, a 400-output-token request cap, a bounded 16 KiB response stream, no redirects and an abortable three-second default deadline (hard maximum ten seconds through the interface). Providers must support this protocol/schema. No external SDK or new dependency was introduced.

Policy instructions are in a system message; the strictly bounded evidence is serialized in a separate JSON user message and explicitly identified as untrusted. No tools, account/rental operations, URL fetching or enforcement callbacks are available. Mock injection examples and request/response isolation are tested. **No claim is made that a real model cannot be fooled**: strict output validation and the absence of enforcement capability bound the impact even if a recommendation is wrong.

### Configuration and safe commands

| Setting | Default and effect |
| --- | --- |
| `CHAT_ANALYSIS_MODE` | Unset/off. Only exact `mock-shadow` enqueues local mock jobs; `cloud` is not a database-worker mode. |
| Existing `CHAT_ENABLED` / `CHAT_PREVIEW_USER_IDS` | Unchanged. Public chat stays off; existing preview is server-side. Analysis settings grant no chat access. |
| `CHAT_SYNTHETIC_CLOUD_ENABLED` | Unset/false. Exact `true` is required for the separate synthetic CLI cloud adapter. |
| `CHAT_SYNTHETIC_CLOUD_ENDPOINT` | Full approved HTTPS chat-completions URL, no embedded credentials/query/fragment. Server-side only. |
| `CHAT_SYNTHETIC_CLOUD_MODEL` | Provider's approved model identifier, at most 80 characters. |
| `CHAT_SYNTHETIC_CLOUD_API_KEY` | Server-side secret, never committed or printed. No credential was supplied or invented. |

Run a no-network, no-database mock pilot:

```sh
npm run analysis:synthetic -- development-001
npm run analysis:synthetic -- development-011
npm run analysis:synthetic -- development-020
npm run analysis:synthetic -- held-out-090
npm run analysis:synthetic -- held-out-057
```

These five commands executed successfully: English rental ALLOWED; Traditional Chinese threat HELD; Indonesian threat HELD; mixed-language obfuscated goods HELD; instruction-injection plus drug offer HELD. Every result required human review. The CLI prints fixture ID, provider/model and classification metadata only. It accepts no arbitrary text, stdin or database records. Do not replace synthetic fixtures with private content.

Cloud usage was **not executed**, including on synthetic messages: no approved provider/credential was configured. Fake injected HTTP transports tested schema handling, timeouts, malformed/oversized responses and outages without any network request. After selecting/approving a synthetic endpoint and supplying its server-side variables, the optional command is `npm run analysis:synthetic -- development-001 --cloud`. It still reads only the checked-in synthetic fixture. Synthetic CLI requests have no automatic retry loop.

### Durable orchestration and human review

When explicitly set to mock-shadow, the existing message transaction also creates one `ChatAnalysisJob`, unique by message and analysis version. Failed transactions enqueue nothing; idempotent replays create neither another job nor another case. With analysis off, no job is created. There is no synchronous provider wait in message creation.

Workers claim with `FOR UPDATE SKIP LOCKED`, take a 30-second lease and perform analysis outside a database transaction. Completion requires the current lease token and an unexpired lease. Expired workers cannot overwrite new work. Three total attempts are allowed, including reclaimed leases; ordinary failures retry after two and four seconds, then become FAILED. An exhausted crashed lease becomes FAILED on the next claim pass. Jobs survive application restarts. Terminal recommendations and job identity/context are immutable and deletion is blocked by a database trigger; no retention deletion runs.

The shipped `npm run analysis:worker` is a bounded local batch (up to 20 claims) and always uses MockProvider. It requires `CHAT_ANALYSIS_MODE=mock-shadow`, the isolated runner's exact matching database URL/run ID and ownership marker. It refuses normal/shared database execution. Tests invoke the same worker functions after checking ownership. This milestone does not ship a production scheduler, a live-cloud worker or an endpoint users can call to trigger provider expenditure. Future versions need an explicit backlog/version-upgrade plan; no automatic historical reanalysis or reset of terminal failures is implemented.

Only assigned, active, explicitly granted reviewers can see recommendations through the existing audited case evidence read. Recommendations are included only if their target and **all** context message IDs are in that immutable case snapshot. The queue and participant history contain no recommendation body. The evidence-view audit records job/message IDs, never private analysis content. An audit write failure returns no evidence. React renders explanations as text. The UI labels the result “Unverified shadow analysis,” shows provider/model/policy/version and leaves the normal human decision controls unchanged. An authorized reviewer can disagree; appeal conflicts/grants/assignment are checked as before.

A timeout, bad result, stale lease, failed job or an ALLOWED recommendation has no authority to release a deterministic hold, change delivery/read cursors, issue warnings, edit accounts/trust, change booking state or skip a human decision. The worker imports none of those services.

### Privacy, latency and operating limits

Ordinary logs receive generic failure codes or numeric job metadata, not original text, prompts, private provider responses, explanations, credentials or raw exception objects. Recommendations may contain sensitive information and remain case-scoped private evidence. Storage remains server-readable, not end-to-end encrypted. Minimized context is not automatic anonymization.

External request count and external cost in this implementation session were zero. No production price or model latency is claimed. Provider requests are bounded by context/output limits and deadlines; costs depend on the selected provider/model and script invocation volume. Existing per-user send/duplicate limits constrain mock queue growth, but many accounts can still create a backlog. Global provider budgets, provider retry headers, queue-age alerts, staff capacity, circuit breaking and abuse thresholds need an approved operational plan before any live AI worker. The local retry policy is bounded engineering behavior, not a user penalty. Holds never expire into release.

## New schema requirement and database safety

Only new migration: `20261019180000_chat_shadow_analysis` (after `20261019150000_chat_activity_order`). It adds `ChatAnalysisJob`, its sequence, message foreign key, unique/indexes, bounded state/attempt/context checks and the `protect_chat_analysis` function/trigger. The Prisma schema adds the model and the back relation on ChatMessage. No historical SQL/checksum is edited. There are no existing-message/booking/evidence updates, backfills, resets or deletions.

The new table is required before running this branch's case evidence reads, even with analysis off. Regenerate Prisma Client with `npx prisma generate --config prisma7.config.ts`. This report does **not** authorize migration of any live/existing marketplace database. All database verification used the repository runner's newly created `hustlen_test_*` databases, exact matching app/test URLs and ownership comment; it refuses existing names and drops only its own database/uploads after stopping servers. `p2p_marketplace` was never a test target. A retained demo created on the previous branch lacks the new table: use a fresh demo name/state rather than starting old fixtures and assuming they are upgraded. Preserve old fixture evidence; do not migrate/adopt/reset it as part of this review. The demo launcher has one ignored state location per checkout, so initialize the fresh demo in a separate clean checkout without copying the old ignored state or uploads.

For local verification, choose actual test-only credentials and a fresh unused name, then use the existing isolated runner. For zsh, paste commands without explanatory `#` comment lines unless interactive comments are enabled:

```sh
export MRT_TEST_DATABASE_URL='postgresql://TEST_ROLE:TEST_PASSWORD@localhost:55433/hustlen_test_intelligent_review_01'
npx prisma validate --config prisma7.config.ts
npx prisma generate --config prisma7.config.ts
npm run test:chat
```

Change the name for another invocation if it still exists; never adopt or delete an unowned database. Required tools remain Node/npm, local PostgreSQL with a test role allowed to create/drop new databases, Chromium/Playwright, and existing media tooling for the complete regression suites. No security/network settings were changed.

## Regression evidence

Final command results and counts are recorded in [verification.json](intelligent-moderation/verification.json). Only executed checks are marked passed there. Browser evidence means automated real Chromium forms/pages and HTTP requests, not human acceptance or a simulated UI.

All final commands below exited 0. The full regression pass was followed by the affected chat/unit/type/lint/build checks after the last analysis-validation and scope-test edits; implementation content stayed unchanged during that final recheck. There were no final failed, skipped or blocked local regression checks. Node counts include parent test results.

| Command | Final result |
| --- | --- |
| `npx prisma validate --config prisma7.config.ts` / `generate` | Passed |
| `npx tsc --noEmit`, `npm run lint` | Passed |
| `npm run test:unit` | 32 passed |
| `npm run test:chat` | 14 passed; actual API/browser/restarts and analysis jobs |
| `npm run test:stability` | 8 passed |
| `npm run test:rental-api` | 13 passed |
| `npm run test:rental-browser` | 4 passed |
| `npm run test:integration` | MRT API/browser functional script passed |
| `npm run test:admin` | 7 passed |
| `npm run test:moderation` | 10 passed |
| `npm run test:migration` | MRT data/migration functional script passed |
| `npm run test:admin-migration` | 1 passed |
| `npm run test:mvp` | 11 passed |
| `npm run build:verify` | Production build passed on an isolated migrated database |
| Synthetic evaluation / five mock pilot commands | Passed execution; six measured held-out misses disclosed above |

Total: **100 passing Node test results**, plus the functional scripts, evaluation and build. The standalone demo acceptance script was updated but not rerun on a retained demo database; equivalent repaired classifications, moderation UI and rental flows were exercised through the isolated chat suite. A negative local worker smoke check rejected a protected database prefix before any connection (using placeholder localhost:1 URLs). Earlier draft Prisma generation caught an incorrect relation placement; it was corrected before database verification, then generation/schema/type checks passed.

The expanded chat suite covers the existing feature flag, owner/borrower derivation, race/idempotency, unread/ordered delivery, long pagination and late release/reconnect, held confidentiality, bounded/granted/assigned/audited review, warnings, rejection, independent appeal/correction, log privacy, report/block controls, booking references and the complete handoff/return/inspection/review flow during restrictions, two-user browser interaction and server restart. Added checks cover the two fixed examples over actual APIs, immutable original bodies, exactly one analysis job/case, timeout/outage/retry persistence, malformed responses/attempt exhaustion, worker races and stale fencing, terminal evidence immutability, scoped recommendation display/auditing, human disagreement and analysis-off behavior.

Unit tests additionally cover multilingual normalization/context and independent clauses, strict output/version/enforcement-field rejection, bounded inputs, prompt-envelope isolation, mock injection behavior, provider timeout/abort, malformed/oversized fake HTTP responses, cloud-disabled configuration, privacy-safe failures, partition separation and metric denominators. The original combined rental/admin/MRT/security/migration suites are retained.

CI is not reported passed: this task runs local executable verification. The configured workflow triggers PRs, main/integration pushes or an authorized workflow dispatch; pushing this feature branch alone does not prove CI ran. GitHub API/workflow operations were forbidden in the preceding environment work, and no restriction was bypassed. Real cloud processing and human label/manual acceptance remain unexecuted.

## Outstanding decisions and review limits

1. Review the proposed dataset labels and choose a labeling guide, including ambiguous slang, quoting, warnings and when review should hold delivery. Add independent multilingual labels, broader benign coverage and a fresh blinded evaluation before claiming production detection quality.
2. Approve provider/model/region, contractual data handling, provider training/storage controls, privacy notice, consent/opt-in and precisely which preview users/content may enter a live pilot. Real message processing currently has **no enabling switch** in the shipped worker. After approval, a separate reviewed change must add scoped dispatch, privacy/redaction controls and a production-safe worker/service identity; do not repoint the synthetic fixture command at marketplace data.
3. Approve budget/volume ceilings, monitoring, staffing, escalation ownership/SLAs, emergency handling and review quality sampling. Assignment remains explicit claim; there is no automatic escalation/staff rota policy.
4. Approve message, analysis-job/recommendation, reported evidence, audit and appeal retention/deletion/archival requirements, including legal holds and user notices. No deletion policy was invented or enabled.
5. Decide how historical/versioned analysis is reviewed, which cases can be reanalyzed and how to recover terminal failures without altering immutable evidence. No retroactive reclassification or automated penalty is included.
6. Existing no-show/failed-meetup/handoff-refusal and other earlier product-policy decisions remain unchanged; this work does not resolve them by inventing rental rules. See the earlier stabilization/demo reports.

P1 follow-up before public/live AI release: indirect-threat/slang recall and independent label validation; approved privacy/consent/provider arrangements; production worker identity/scheduling/backlog monitoring/budgets and staffing/retention policy. Mock agreement is not evidence that a cloud model is safe or more accurate. The branch can be reviewed independently once the recorded regressions pass; it is not a claim of readiness to enable public or real-data AI moderation, merge, deploy or begin QR/mobile work.

## Exact implementation files

The complete changed-file list is recorded in verification.json. Synthetic fixtures and generated evaluation/review artifacts are intentional versioned deliverables. Generated Prisma clients, bundles, dependencies, database state, uploads, credentials, temporary scripts and raw server logs are excluded from the commit. Main responsibilities:

| Files | Purpose |
| --- | --- |
| `lib/chat/policy.ts`, `tests/chat-policy.test.ts` | Deterministic classifier and regression examples |
| `tests/fixtures/moderation/v1.json`, `lib/chat/evaluation.ts`, `scripts/evaluate-moderation.ts`, evaluation artifacts | Versioned proposed labels, metrics, human-review table |
| `lib/chat/analysis/provider.ts`, `cloud.ts` | Bounded provider contract, strict validation, mock, optional synthetic HTTPS adapter |
| `lib/chat/analysis/jobs.ts`, `lib/chat/service.ts` | Atomic optional queue, leases/retries, no enforcement |
| `prisma/schema.prisma`, new migration SQL | Additive durable evidence/job storage and protection |
| `scripts/analyze-synthetic.ts`, `scripts/chat-analysis-worker.ts`, `package.json` | Safe synthetic pilot and isolated local worker commands |
| `lib/chat/moderation.ts`, `components/chat/reviewer.tsx` | Existing case-scoped audited recommendation access and unverified display |
| `tests/chat-analysis.test.ts`, `tests/chat.integration.test.ts` | Provider/security/evaluation tests and actual API/browser/worker regressions |
| `scripts/chat-demo-acceptance.ts` | Update old demo assertions to repaired classifications |
| This report, earlier-report pointer, verification/evaluation artifacts | Review evidence and instructions |
