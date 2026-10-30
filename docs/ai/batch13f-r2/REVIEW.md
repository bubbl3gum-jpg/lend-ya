# Batch 13F-R2 — Source-aware local Qwen generation

30 October 2026, Asia/Taipei. Focused development candidate; genuine Qwen acceptance pending.

## Baseline and diagnosis

Branch `fix/local-qwen-generation-reliability-batch-13f-r2` starts at clean committed playable-demo HEAD `baad3b670fcdeaf925c96359cc293b35575ae8e9`. Two unfinished launcher-startup diagnostic files from an earlier troubleshooting turn were preserved in a named Git stash, not included or discarded. The owner reports the launcher now works; this batch does not alter it.

Owner-observed translation and borrower failures are FACT_SOURCE_KIND/knownFacts. The existing generic generation schema permitted any string reference in every statement; the prompt did not explicitly require empty facts when no CONTEXT exists. The validator correctly rejects participant claims as verified context. The latest injection failure category is unknown; this change cannot establish its cause or promise its resolution.

## Correction and unchanged boundaries

- `sourceAwareAdvisorySchema()` derives exact source-ID enums from the server-selected manifest, never browser input. Known facts admit only CONTEXT IDs. No context means maxItems=0. Other referenced statements admit only manifest IDs. Reference uniqueness is requested.
- Preserve the same required fields, text/array bounds and independent validator. Invalid output still fails visibly; no filtering, rewriting, retry or scripted replacement.
- Explicit instructions distinguish synthetic application context from allegations, prohibit claim promotion, preserve negation/uncertainty/dates/amounts/agreement, and treat embedded instructions as untrusted. A proposed pickup-time change does not establish acceptance.
- Existing numerical-loopback transport, strict catalog, 60-second deadline, token/context limits, diagnostic categories, auth/session recheck, private Support worker and production refusal are unchanged. No schema or prompt can certify semantic truth.
- Actual Ollama support/enforcement of these JSON-schema constraints and output quality require the Mac run. No real model is installed or executed in this workspace.

## Mac acceptance

After obtaining this branch locally:

```sh
git switch fix/local-qwen-generation-reliability-batch-13f-r2
npm ci
npm run demo:local-ai
```

Use the same private Docker-credential launcher wrapper that successfully started the existing demo, or supply its equivalent trusted DATABASE_URL and a **new** MRT_TEST_DATABASE_URL using host port55433 and a unique `hustlen_test_*` database name. The bare npm command requires those environment values; never paste credentials into a report. Do not reuse an existing database. Ollama must already serve genuine `qwen3.5:9b` at numerical loopback11434; Chromium must be installed.

In the visible browser select each of these, generate once, and retain every failure:

1. SYN-BORROWER-A:en
2. SYN-REVIEW-INJECTION:en
3. SYN-REVIEW-TRANSLATION:zh-TW

Require actual HTTP200, LOCAL_OLLAMA_INFERENCE, visible advice and correct source attribution. Compare source text manually, particularly proposed versus agreed time and Traditional Chinese negation. Claims-only manifests must produce empty knownFacts. Inspect only the existing safe reason/field diagnostic on failure; do not publish raw responses, source material, hidden thinking or cookies. No automatic retries; record manual attempts separately. Ctrl+C performs the launcher's existing owned cleanup without stopping Docker or Ollama.

For bounded automated genuine acceptance, the existing `npm run test:local-ai-real` now covers all three selectors using real native login and actual inference. Supply the same trusted connection configuration with a fresh guarded target. It remains fail-fast; a first failure means later scenarios are untested. This command closes its browser; use demo:local-ai for manual exploration. Real inference results, latency and model quality remain unavailable here.

## Scope and approval

No application database or historical migration change, real customer input, translation service, new feature, production activation or permission change. Structural passes are not factual, safety or human quality approval. Next action is owner hands-on testing, not another implementation batch.

## Verification ledger

- `npm run test:unit`:156/156 pass (final run).
- `npx tsc --noEmit`:pass after correcting an initially inferred never[] in the new test helper; no runtime workaround.
- `npm run lint`:pass.
- `npm run test:local-ai-diagnostics`:1/1 pass; actual authenticated app/DB, mock inference, existing category/secret-leakage negatives.
- `npm run test:local-ai`:1/1 pass; mock inference only.
- `npm run test:authorization`:8/8 pass.
- `npm run build:verify`:pass; normal production build through the existing fresh-owned-database harness.
- `npm run test:local-ai-demo`:first invocation refused EADDRINUSE at numerical loopback11434 because test:local-ai concurrently owned its mock daemon. No daemon was replaced. Serialized rerun:1/1 pass on a visible Chromium/Xorg test display, actual native login and protected worker, manual mock success and visible502, retained window, SIGINT cleanup and external services alive.
- All changing checks used newly created guarded disposable databases; runners reported removal. Launcher test verifies its marked database, roles, socket and temporary files are removed and external PostgreSQL/Ollama remain available. No existing application database/migration history altered.
- Full camera/meetup, marketplace and unrelated suites were not rerun in this narrow prompt/schema repair. No full-regression or genuine-Qwen pass claimed.
