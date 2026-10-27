# Offline human review — operational instructions

Stage 10, 27 October 2026 (Asia/Taipei). This is local synthetic review, not a production review service or live-experiment permit. No reviewers have supplied scores. **Completed genuine reviews: 0/32; 192 dimension scores null.** No verified reviewer identity, approval or completed date has been created.

## Prepare and review

From the repository root:

```sh
npm run ai:review -- prepare /tmp/hustlen-review-new
npm run ai:review -- validate /tmp/hustlen-review-new/review.json
```

Prepare requires a new directory and exclusively writes mode-0600 files in a mode-0700 directory. Existing paths are refused, preserving reviewer work. `packet.json` contains exact synthetic sources, offline candidates, hashes, validation and hints; `REVIEW.md` is a readable printable packet; `review.json` is the editable scoring template. The committed packet is under `review-packet/` beside this document. No credentials, environment loader, network or database is used. Output filenames are fixed; local path selection is explicit CLI authority, not a web upload API.

1. Read the six-dimensional rubric in `../../ai/batch12c/DATASET_AND_RUBRIC.md` (also reproduced in the packet). Keep its terminology and 0/1/2 semantics. A score is not permission or production acceptance.
2. Compare each claim against **its own** source references, not simply another source in the same case. Review summary, observations, draft, uncertainty, omissions and citation placement separately. Record unsupported statements even when schema validation succeeds.
3. Inspect both output languages against the identical source material. Use `LANGUAGE_REVIEW_MATRIX.md`; a prewritten Chinese clarification draft is not translation evidence.
4. Fill all six scores for an item only after actual review. Use a non-identifying alias matching `REVIEWER-[A-Z0-9-]{1,32}`, an actual UTC timestamp `YYYY-MM-DDTHH:mm:ssZ` (not a future or impossible date), and a substantive observations paragraph. Review notes are plain single-line text, maximum 2000 characters per field, no markup/control characters. Record unsupported claims, translation problems and privacy concerns in their dedicated fields. For unreviewed items leave all scores, reviewer and time null; draft notes may be supplied without asserting completion.
5. Validate the edited JSON. The validator regenerates the **trusted checked-in** packet instead of trusting an imported manifest or candidate. It checks exact fields, count, unique IDs, dataset/result bindings, rubric and scores; unknown roles/approval fields, altered snapshots, partial scores, foreign/duplicate items or malformed files fail closed. File input is a regular non-symlink file, bounded to 512,000 bytes. Only summary counts/booleans are printed; notes and aliases are never logged. JSON object member names should not be duplicated; use the generated template.
6. Keep actual completed reviews locally under an agreed reviewer-access/retention procedure. Do not commit filled reviews, identity mappings or sensitive observations without separate review. The importer validates in memory, never writes a database or converts a file to authority. Paper/Markdown reviews require manual transcription into the bound JSON to validate; Markdown itself is not parsed as scores.

## Evidence layers and limitations

- **Machine:** existing schema/reference validation. VALID means structure, not truth, safety or successful translation.
- **Heuristic:** existing transparent lexical hints, with known negation/quotation false positives and paraphrase/mixed-language misses. Absence of hints is not a pass.
- **Human:** genuine supplied scores and rationale. Imported attribution is self-reported; parser validity cannot verify a person's identity, independence, competence, honesty or review completion. Report submitted items separately from independently verified reviews. There is no aggregate release score or automatic approval.
- **Live model:** provider/model/latency/token/spend measurements unavailable, represented null. No live request occurred; zero requests does not establish model quality.

The generated packet contains candidates for 16 original tasks plus 16 proposed supplemental tasks. Both are deterministic offline outputs, including deliberate baseline shortcomings. The supplemental fixtures never become selectors in the application notebook. Do not use this CLI with actual Support conversations, private evidence, credentials or personal data. Content-pattern filters cannot certify that arbitrary human notes contain no secrets; minimization and local review remain necessary. The CLI is a local evaluation tool, not a security sandbox for arbitrary files.
