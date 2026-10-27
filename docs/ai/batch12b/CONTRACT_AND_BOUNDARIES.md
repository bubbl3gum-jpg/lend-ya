# 12B offline integration contract

Stage 10, 27 October 2026. No external calls, purchases, provider credentials or customer-data processing are authorized. The shipped composition is deterministic and returns **“Simulated — no AI model was called.”** No provider SDK, model adapter, AI grant or Stage 11 executor is introduced.

## Actual source and reuse

Verified clean baseline `993967f4363a4a1218ac9be978e844f6ee182158`, with ancestors 12A implementation `cf67562c6df99ea486aa354f24db5ea52305d34d` and closeout `b542b54d73bb0cdb0110bb08dce3eb116fa36a59`. Isolated branch `feature/synthetic-ai-integration-batch-12b`. Reviewed canonical roadmap, 12A product/integration/privacy proposal, source fixtures/page, `lib/support/{tickets,channels}.ts`, scoped staff/assignment contracts, existing request validation and bounded operational logging. Prior infrastructure audit remains at `docs/ai/batch12a/EXISTING_INFRASTRUCTURE_AUDIT.md`; existing mock-shadow/cloud adapter behavior is unchanged, and its unit transport tests are not live model calls.

| Module | Responsibility |
| --- | --- |
| `lib/ai-case-brief/contracts.ts` | Version `synthetic-brief-v1`, typed manifest/result/adapter/error contracts. No privileged action fields. |
| `manifest.ts` | Exact synthetic selector, one case/one side, sorted source events, excerpts, title, missing/conflicts, intended CASE_BRIEF task, en/zh-TW. No authored answer, rental join, database or provider lookup. |
| `service.ts` | Offline adapter and orchestration: immutable snapshot clones, bounded deadline, abort listener cleanup, output validation and classified errors. Current composition rejects non-NONE model labels; no live fallback or credential lookup. |
| `validation.ts` | Exact keys/types, closed category, version/case/language, source references/order, excerpt correspondence, bounds and human-review requirement. |
| `evaluation.ts` | Sixteen observable offline scenario checks, versionable case selectors and expected outcomes. No subjective/model-quality score. |
| `app/api/admin/ai-case-brief/route.ts` | Development-only ACTIVE legacy Admin/session GET manifest and POST simulated generation, with request validation and session recheck before release. No case mutation or live record query. |
| `components/admin/ai-case-brief.tsx` | Same-origin service consumer, source links, honest failure/last-valid-draft states, review/reset, cancellation and localization. Imports contract types only, not server manifest/adapter/whole fixture payloads. |

The page supplies directory **metadata** and one initial manifest. Other source bodies and authored responses are no longer shipped in a client import. Changing case retrieves only that selected manifest; old source panes are hidden while selection and snapshot differ. Synthetic directory titles are intentionally visible; this is not real per-case authorization or secure erasure of previously viewed browser memory.

## Typed input and output

Manifest: exact version, stable SYN-* case ID, OWNER or BORROWER side, task, output language, title, ordered sources `{id, at, kind, excerpt}`, missing/conflict lists and truncation flag. Builder limits ≤12 sources, ≤1000 characters each, ≤6000 excerpt characters total; long history is explicitly truncated rather than inferred. Unknown case IDs, caller objects and unsupported languages fail. Strict manifest validation rejects extra fields, duplicate/empty sources and malformed ordering/bounds. IDs/prefixes are not proof that arbitrary external text is synthetic: the public route accepts only a selector and always uses the checked-in builder.

Output: exact schema/case/language, summary and observations with `{text, refs, basis}`, ordered timeline source IDs, closed category, missing/conflicts/questions, draft, uncertainty and mandatory requiresHumanReview=true. Source IDs must belong to this manifest; duplicates and foreign/missing IDs fail. SOURCE_EXCERPT requires exactly one ID and exact excerpt equality. INTERPRETATION is unverified, even with a resolvable citation. Invalid schema, false excerpt attestations, unknown action/role/tool fields, markup and known command-shaped draft text fail. Plain text is escaped, never evaluated or dispatched.

**A citation is not evidence of semantic truth.** The test deliberately supplies “handoff is complete” as an INTERPRETATION citing a question; schema validation can accept it only as an unverified interpretation requiring human checking. No automatic semantic contradiction detector or model-quality claim is made. Natural-language command filtering is limited defense in depth; absence of tools/executors and independent application authorization are the security boundary. Future real-model evaluation must assess entailment, accusations, translations and unsupported conclusions separately.

## HTTP, failure and resource bounds

Same existing exact development flag and NODE_ENV gate, including early proxy refusal for both page and API in production. Legacy ACTIVE Admin plus current session at entry; POST re-resolves session before releasing the synthetic result. No new staff role/association/grant. GET accepts exactly one caseId/language. POST accepts exactly `{caseId, language, condition}`, ≤32 KiB through existing bounded JSON reader. Condition is a fixed **deliberate offline test fault**, not provider selection. Exact configured localhost origin `HUSTLEN_AI_BRIEF_ORIGIN`, same request origin, custom header and existing Origin/cross-site protections are required. Unknown fields/account selectors/manifests/roles and arbitrary source text are rejected. Responses are private no-store, Vary Cookie.

Offline process-local limiter: 40 valid-shaped attempts per trusted Admin per 60 seconds, counter capped at 41; expired entries pruned, at most 1000 actor entries, fail closed at capacity. This is a bounded development resource control, not a durable/multinode production rate/budget system. LIMIT condition demonstrates the error separately. No inference spend occurs.

Adapter deadline defaults 1500ms, allowed internal range 1–3000ms, no retries. Client deadline 4000ms bounds HTTP wait. Abort cancels listeners/timers; sequence fencing ignores late/stale results after cancel, selection, navigation or unmount. Cooperative adapter cancellation cannot terminate malicious synchronous code; the shipped adapter is bounded/offline. No general agent framework or arbitrary plugin loader. Adapter interface alone cannot prove a future adapter has no egress; the current audited composition has no networking and cannot select an external adapter from a browser/environment flag.

Errors distinguish INPUT/LANGUAGE, VALIDATION, REFERENCES, UNAVAILABLE, TIMEOUT, LIMIT, CANCELED and HTTP SESSION/DENIED/ORIGIN. No error message, source body, provider body or credential is logged. Unexpected operational exceptions use the existing bounded logger. The API has no send/status/evidence/staff/financial/setting mutation path. Only own-session authorization reads and ordinary expired-session cleanup use existing auth persistence; the AI manifest service never reads private records.

## Privacy and future integration

Shared rental labels never merge Owner–Support and Borrower–Support. Assignment does not authorize every ticket/message/evidence item. Live Support AI remains blocked by Stage 7 and exact case/message/export authorization. A legacy Admin session in this synthetic demo is not future blanket access. A future approved provider adapter must be server-only, use a dedicated bounded service identity and independently authorized minimized snapshot, exact endpoint/model/egress/secret handling, pre-export/pre-release authorization fences, audit/retention and human review. Existing API keys or flags do not approve any of that. All real-model code and calls remain absent.
