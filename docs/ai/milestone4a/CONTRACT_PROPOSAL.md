# Translation sidecar contract — proposal only

31 October2026, Asia/Taipei. **Not implemented, not an approved provider/release policy.** No new runtime type/schema/API or validator replaces existing code. Type sketches below describe a future exact-key validator; TypeScript alone is not security enforcement.

## Placement and canonical record

`existing Qwen reasoning → existing independent Advisory/source validation → immutable canonical response snapshot → selected translation segments → independent translation integrity checks → separate labelled localized view → optional user review/edit`

Do not send an invalid/failed Advisory to translation to make it appear successful. Keep current Qwen prompt, bilingual draft generation and source-aware validator unchanged. Translation cannot establish source truth, policy approval, account authority or visual findings.

Canonical snapshot is the actual validated reply plus exact manifest/version/locale, existing source ID/kind/ref mappings and, where applicable, M5B notes. Bind with a new versioned deterministic serialization specification (UTF8, sorted object keys, preserved array/string order; no Unicode normalization unless separately agreed). Digest the **actual snapshot**, never a translated/reconstructed result. Reuse existing M3 stable-digest helper only after verifying identical definition; do not change its historical digest algorithm. Server-generated responseRef is opaque, page/session-scoped and nonselectable across actors.

Existing main response may be en or zh-TW. `manifest.language` records requested output locale, not a language classifier or proof of linguistic correctness. A future canonical sidecar needs explicit source-locale metadata and a policy for mixed/unknown source text. No auto-detected language may change source kind, authority, locale preferences or original content. Default proposed refusal on unsupported/mixed scope; do not assume a Chinese draft is English or call Simplified→Traditional character conversion a faithful translation.

## Exact field allowlist

Initial proposed translatable paths:

- `knownFacts[i].text`, `participantClaims[i].text`, `nextSteps[i].text`
- `uncertainties[i]`, `requiresAgreement[i]`, `humanReview[i]`
- **One explicitly selected** `drafts.en` or `drafts.zh-TW`, only when its own source locale matches the request. Keep both original Qwen drafts and identify the dedicated translated draft separately; do not overwrite the original target-language Qwen draft.

No wildcard JSON path or arbitrary text. Snapshot validation determines allowable indices (0–11 under existing Advisory). No `refs`, IDs, source kinds, enum values, classification/stage codes, timestamps, model/assurance/approval values, raw source excerpts, knowledge catalogue or unrelated records sent as text. M5B clarification-question translation could be a separately reviewed extension; not silently included initially. Existing authored en/zh-TW UI labels and M5A knowledge text remain authored catalogues with unchanged source IDs/versions/review status.

Editable local summary is **outside** the first translation contract: it may contain original untranslated excerpts, edits and an8000-character draft exceeding Support's2000-character payload. User text is neither canonical model output nor permission to export. Future explicit draft translation must have its own edit-digest binding and consent; no automatic overwrite, truncation or ticket submission.

## Proposed strict types

```ts
// Proposal only: not application code.
type AppLocale = 'en' | 'zh-TW';
type CanonicalBinding = {
  responseRef: string;             // server-issued opaque current-session reference
  canonicalDigest: string;         // sha256: + 64 lower-case hex
  manifestDigest: string;
  sourceLocale: AppLocale;
};
type FieldPath =
  | `knownFacts[${number}].text` | `participantClaims[${number}].text`
  | `nextSteps[${number}].text` | `uncertainties[${number}]`
  | `requiresAgreement[${number}]` | `humanReview[${number}]`
  | 'drafts.en' | 'drafts.zh-TW';   // runtime grammar + existing index bounds required

type TranslationIntent = {
  version: 'advisory-translation-request-v1';
  responseRef: string;             // current session only
  canonicalDigest: string;         // checked against server snapshot
  targetLocale: AppLocale;
  fieldPaths: FieldPath[];
  requestId: string;               // exact UUID, actor/session-bound retry identity
};
// Browser must NOT send segment text, refs/kinds, model/provider/endpoint,
// source locale assertions, credentials, integrity verdict or authorization.
// Only this minimal intent is accepted from the browser; no segment text.
// Resolve sourceLocale/manifestDigest from the trusted snapshot, not echoes.
type ResolvedTranslationRequest =
  Omit<TranslationIntent, 'responseRef' | 'canonicalDigest'> & {
    canonical: CanonicalBinding; segments: Segment[];
  };

type Segment = {
  segmentId: string;               // server-generated, not provider authority
  path: FieldPath;
  canonicalTextDigest: string;
  protectedText: string;           // synthetic approved text only in first pilot
};
type ProviderMetadata = {
  provider: 'DEEPL' | 'GOOGLE_CLOUD_TRANSLATION' | 'AZURE_TRANSLATOR'
          | 'AMAZON_TRANSLATE' | 'LOCAL_TRANSLATION_MODEL';
  adapterVersion: string;
  apiVersion: string;
  requestedModel: string | null;
  reportedModel: string | null;    // null if vendor does not return a build ID
  modelPin: string | null;         // not fabricated for mutable managed models
  terminologyVersion: string;
};
type TranslatedField = {
  segmentId: string;
  path: FieldPath;
  canonicalTextDigest: string;
  translatedText: string;
};
type TranslationFailure =
  | 'UNAVAILABLE' | 'NOT_AUTHORIZED' | 'UNSUPPORTED_LANGUAGE'
  | 'MIXED_SOURCE_UNSUPPORTED' | 'STALE_CANONICAL' | 'INPUT_LIMIT'
  | 'LIMIT' | 'TIMEOUT' | 'CANCELED' | 'PROVIDER_FAILURE'
  | 'MALFORMED_RESPONSE' | 'FIELD_MAPPING' | 'PROTECTED_VALUE_MISMATCH'
  | 'OUTPUT_LIMIT' | 'SUSPECT_LANGUAGE';
type TranslationState =
  | { version: 'advisory-translation-v1'; state: 'NOT_REQUESTED' | 'NOT_NEEDED';
      canonical: CanonicalBinding; targetLocale: AppLocale }
  | { version: 'advisory-translation-v1'; state: 'AVAILABLE_UNREVIEWED';
      canonical: CanonicalBinding; targetLocale: AppLocale;
      provenance: 'DEDICATED_TRANSLATION_API' | 'LOCAL_TRANSLATION_INFERENCE'
                | 'MOCK_TEST_OUTPUT';
      provider: ProviderMetadata; fields: TranslatedField[];
      latencyMs: number; billableCharacters: number | null;
      integrity: 'STRUCTURAL_CHECKS_PASSED'; semanticReview: 'UNREVIEWED';
      artifactDigest: string }
  | { version: 'advisory-translation-v1'; state: 'FAILED' | 'CANCELED';
      canonical: CanonicalBinding; targetLocale: AppLocale;
      failure: TranslationFailure; latencyMs: number | null };
```

The HTTP intent must reject client-owned sourceLocale/provider/text fields; ResolvedTranslationRequest and CanonicalBinding are internal service contracts, not permission to post them. Exact keys/additionalProperties:false recursively. No unrestricted JSON payload. Code-like `number` path types require runtime index whitelist, no negative/exponential/duplicate/unknown selectors. Null means unavailable, not zero cost or implicit approval.

Proposed **initial** bounds pending owner review: one language direction/request;≤16 selected fields, each original field within existing2000-character policy,≤8000 Unicode scalar values and≤32KiB encoded text/request,≤64KiB provider response, each translated field≤4000 Unicode scalar values, total translated text≤16000. These do not change any existing application/Support bounds. If a translated draft cannot fit its actual destination's current limit, keep it as preview with a clear limit error; no silent shortening or forced save. Provider-specific stricter limits win. Exact character, byte and surrogate validation must be defined, not rely on JS length for all units.

Future provider call policy proposal: one active translation per session, explicit deadline, bounded account rate, **no automatic retry or fallback**, abort/stale-sequence fencing and no automatic full-response/two-language expansion. Values require owner approval; no SDK defaults may silently add retries. Same request ID/binding/target/fields must return the same local in-flight/result identity; provider timeout cannot guarantee no billing and must not cause hidden retry. No persistence mechanism introduced now.

## Source and meaning integrity

1. Resolve current authenticated actor/session and current owned-development scope; obtain canonical reply from exact scoped server snapshot. Do not accept arbitrary response IDs or retrieve a booking/Support source. For first synthetic pilot, canonical snapshot contains only permitted synthetic data. Browser page memory alone is not a trusted canonical snapshot store.
2. Verify original Advisory with existing independent validator; recompute exact canonical/manifest digests. `knownFacts` still requires original server-selected CONTEXT refs. Do not run a translator before this validation or reinterpret translation as a new source.
3. Build exact paths/segments locally, keeping source IDs/kinds/ref arrays entirely local. Provider gets only selected protected text, not the whole object or raw source records. Record field-to-segment map and deterministic text digests.
4. Protect explicit literal values (currency/amount/date/time/timezone/IDs/quoted identifiers) with collision-resistant per-request placeholder tokens where appropriate. Preserve original literals locally; reject duplicate/missing/altered/unknown tokens. Restore only trusted exact tokens and revalidate. This is reversible value-preserving encoding, **not silent semantic repair**. Never replace uncertain wording to make a failing translation pass. Unicode lookalikes, pre-existing token-like strings and token reordering within date/amount expressions must be handled explicitly. Reject ambiguous spans rather than guess. Only literal formats initially; no timezone/currency conversion or calendar inference.
5. Negation/uncertainty/role/agreement are primarily semantic. Placeholder presence, equal number sets or back-translation cannot prove “not confirmed” remained not confirmed. Use lexical hints only as warnings, preserve original, and require human review. Do not certify liability preservation with a regex. A protected “NT$400” may still be assigned to the wrong participant even when unchanged.
6. Map provider results using its documented native per-input response semantics. Require exact expected count/IDs/local map, no duplicate/missing/extra fields, valid locale, length, controls and placeholders. A provider-echoed ID is not proof of semantic alignment. Structured source metadata never round-trips through translation. Add no new claim/ref. Reassemble only a **display sidecar**, never mutate the canonical Advisory or source manifest.
7. Preserve per-field current source text, target text, original-language badge, canonical source links and original case-note/knowledge review status. Clear distinction between general procedure, participant report, AI advice and translation. Structural checks passed ≠ faithful translation ≠ verified fact ≠ permission. Preserve authority/side/time/uncertainty indicators in both views.

## Failure and editable-draft behavior

Translation unavailable, stale, canceled or rejected → preserve canonical original visibly with explicit “Translation unavailable/rejected; original response shown” status and safe reason. No HTTP200 success masquerade, scripted translation, automatic switching to another provider or rewriting the original. If target equals source, show NOT_NEEDED without a paid call; still do not pretend a mixed-language response is fully translated.

Sequence/cancellation fences ensure late translation cannot overwrite a newer canonical reply, conversation reset, language selection or draft edit. Bind original draft digest before translation; if the user edits meanwhile, show the result as a separate optional suggestion only, never overwrite. Applying it requires explicit user choice and leaves it unsent. M5C handoff must show the **actual final text** and obtain new confirmation; existing frozen retry payload/key cannot be changed by a late translation. No automatic ticket creation, staff escalation or notification.

No provider raw error body/text or unknown field names in logs/errors. Safe category, attempt correlation, measured latency and unavailable/null usage only. No fake model version, exact cost or quality score. A managed-service API/model-type name is not an immutable model snapshot; record this limitation.

## Binding to evaluation without rewriting M3

Existing M3 ResultRecord/ReviewRecord validate canonical Advisory and result digests; preserve them. Proposed translation evaluation sidecar binds `canonicalResultDigest + translationArtifactDigest + locale + mappingVersion`. Reuse six rubric dimension identifiers/definitions and partial/N/A state semantics in a **new additive review sidecar**, not by inserting translated output into a historical M3 result or forging a new genuine inference outcome. A future validator/packet importer needs separate bounded implementation approval. No historical corpus/result hash changes, invented reviewer identities/scores or completed dates.

This document is the contract proposal, not implementation. No routes, snapshot store, translator, provider credential, network client, artifact persistence or feature flags are added.
