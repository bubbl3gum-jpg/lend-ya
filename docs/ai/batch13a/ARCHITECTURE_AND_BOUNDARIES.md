# Batch 13A shared foundation and Customer Service contract

Stage 10, dependent on Stage 7; 28 October 2026, Asia/Taipei. Programme checkpoints 13B/13C/13D are not implemented in this checkpoint. No model inference or external provider. No Stage 11 executor.

## Verified baseline and reuse

Clean branch `feature/offline-ai-quality-review-batch-12d`, actual HEAD `911fc303d604514d92cbe8238884b0e1bbaebb97`; supplied implementation `008acb786898a39c6e9edd37b5e3020d17fa4c18` and evidence `e40b240105fa7e252b34b14664f19d543e4074f3` are ancestors. Isolated branch `feature/customer-service-companion-batch-13a`. Reviewed AGENTS, original roadmap, Stage 7 candidate, 12B–D contracts, design contract/foundation, current global/heritage styles and installed Next route guide.

Existing Case Brief contracts require case/source schema and source-excerpt versus interpretation distinctions; they remain unchanged, pinned and available for evaluation. The new guide/case DTO needs procedure references and persisted channel timestamps instead of pretending operational IDs are SYN-* Case Brief fixtures. A narrow sibling `lib/assistant` composes deterministic text, not a second model framework. The existing no-live checkpoint and `refuseLiveExperiment` remain authoritative and unchanged; no provider seam that can load a plugin/credential is added. Future adapters must pass separately approved minimization/output contracts; an enum is not authority.

| Module | Contract |
| --- | --- |
| `contracts.ts` | Closed explicit CUSTOMER_SERVICE / OWNER / BORROWER scope vocabulary. Only GUIDE and COPILOT operations implemented, both CUSTOMER_SERVICE. OWNER/BORROWER operations, arbitrary histories, roles, context/identity IDs and provider fields rejected. Exact en/zh-TW, fixed intent registry, bounded report/UUID selectors. |
| `guidance.ts` | 18 bilingual procedure/triage entries with source paths. Existing implementation or explicitly unavailable policy, not invented approved refund/no-show/insurance rules. |
| `compose.ts` | Pure bounded offline compositions; source timestamps/refs retained, claims versus application events, limited lexical inconsistency hint, neutral draft, no actions. Staff original sources remain untranslated and labelled. |
| `server.ts` | Independent owned-development runtime gate and session check; exact Origin/Host/CSRF/content/payload validation; process-local bounded rate control; fixed read operations delegated through existing scoped Support API, rechecked before release. |
| `/dev/support-companion`, `/api/dev/support-companion` | Owned-development pages/API only, production refused before data access even with flags. Existing Support workbenches link only when candidate configured. |
| `components/support-companion.tsx` | Heritage material/editorial view, GUIDE/COPILOT selection, explicit no-model notice, local editable drafts, review-before-copy, manual intake link, abort/sequence cleanup, failure clearing, bilingual UI and labelled original-language sources. |

## Trusted data and capability boundaries

`ownedSupportRuntime` verifies database URL/effective owned marker and restricted application principal. Flag alone never establishes ownership; NODE_ENV must be development and all current target/run constraints pass. No new SQL function, migration, DB grant, staff membership or production principal is introduced.

GUIDE: requires a current ACTIVE account and owned runtime, then only fixed procedure text and explicit bounded synthetic user report. No private ticket, channel, booking, listing, media or other participant read. No booking IDs accepted from client. A report is an unverified user statement, not fact, not translated and not persisted. Public/general guidance cannot fall into a private retrieval path. This initial surface is authenticated, development-only; there is no production public assistant.

COPILOT: current actor must also satisfy existing `supportCandidateApi(..., "staff")` checks and restricted worker. Each fixed `ticket`, `events`, `read` operation independently checks session, synthetic USER association, exact assignment/action/channel grants, fresh session-bound passkey assurance and committed audit via existing SQL. Legacy ADMIN/ChatReviewer/mode strings give no fallback. Only selected channel messages (first page, max 10 displayed with truncation) plus permitted ticket metadata/events enter composition. No rental/media join, other-party channel traversal or evidence rewriting. Ticket status is persisted data, not an AI conclusion. A final exact-channel read rechecks authorization after composition and audits before output release. Revocation denies subsequent reads; this does not claim revocation remotely erases previously viewed browser memory or universally cancels already-authorized SQL. Request abort is checked before reads/release; existing worker work may already commit a read audit.

Returned sources are allowlisted `{id,kind,at,text,originalLanguage}`; raw worker payloads, tokens, associations, grant IDs, credential material and request context are not forwarded. Logs use existing bounded structured logger, not reports/errors/request bodies. UI renders React text, never HTML/evaluated commands. Embedded messages are source data; they cannot choose database operations, additional context, scope or tools. Authentication and DAL enforce boundaries, not prompt instructions.

## Product behavior and limitations

Customer has implemented-procedure help, fixed guided triage, editable neutral ticket preparation and manual link to existing owned-test intake. No ticket is auto-created; copy is not submission. Existing intake independently verifies its own actor/resource and explicit submit. This slice does not prefill the intake or persist drafts across navigation. No response-time, insurance, legal, refund or production Support promise.

Staff has an assigned-channel source overview, chronological original references, persisted case status, missing-information question, limited lexical conflict prompt and bilingual clarification draft. It is a **return-focused deterministic preview**, not semantic inference, complete cross-case investigation, automatic translation or media analysis. Unrecognized topics prompt clarification; sources are retained rather than inventing findings. No automatic send, assignment/priority/status/closure, sanctions or payments. Both participants' statements may conflict, but lexical matches can miss paraphrases/negation; no detector quality claim.

The display/draft language follows the existing cookie-backed locale. Language switching preserves local draft and labels its original response language until regeneration; client language never influences authorization. Chinese static guidance/drafts are authored Chinese; original source text is explicitly untranslated, not claimed as localization success. Existing 12D human notes remain provisional in chat, not saved, rescored or converted into approval; Item 4 remains outstanding.

## Future adapter and production blockers

All ten model decisions remain unresolved. No live transport, secret loader, SDK, billable request, private export or model quality result. No approval file/flag can activate a model path. Stage 7 production eligibility, retention/deletion/holds, assignment/governance, real staff identities, production principals, notifications and human escalation ownership remain blocked. Stage 9 visual acceptance remains pending. Future OWNER/BORROWER modules must reuse these typed operations/UI conventions with independent resource DAL checks; they are not activated by the scope enum. Stop at reviewed 13A before separately continuing the programme.

Allowed source text is not automatically scanned/redacted for every possible personal detail. Supervised fixtures must remain synthetic; permission to read a channel does not authorize exporting its content to a provider. The no-egress boundary and unresolved data-processing approvals remain independent even for an otherwise permitted local read.
