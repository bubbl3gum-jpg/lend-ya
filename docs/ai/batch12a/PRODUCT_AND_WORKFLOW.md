# AI Case Brief — first-use-case proposal

Stage 10, not Stage 11 automation. 27 October 2026, Asia/Taipei. Current authorization is **synthetic, scripted, read-only prototyping only**. Product-owner visual and live-AI policy approval are not implied.

## Useful first workflow

A short, source-linked brief helps an investigator entering a case distinguish what was said, what the record establishes and what still needs asking. Prioritize **one exact Support channel at a time**, rather than a general chatbot or all-booking summary. Expected benefit is less rereading and better handover between authorized humans; no measured productivity or model-quality improvement is claimed in 12A.

1. Staff deliberately selects an independently authorized case/channel in a future approved workspace. Assignment alone never grants unrelated tickets or evidence.
2. A separate read-only assistant boundary supplies a minimized, versioned source snapshot. Owner–Support and Borrower–Support stay separate even for the same rental.
3. The brief separates source records/participant claims, proposed summary, suggested category, unknowns, follow-up questions and an editable reply draft. References return the reviewer to exact source excerpts.
4. The human compares every assertion and translation against sources, edits the draft and acknowledges uncertainty. Editing invalidates the local review mark.
5. Any future sending remains a separate deliberate operation under the existing exact human authorization and case-version checks. A reviewed draft cannot close a ticket, change custody, resolve a dispute or grant authority. No send operation exists in this prototype.

## What actually works in 12A

`/admin/ai-case-brief` is available only in development with `HUSTLEN_AI_CASE_BRIEF_DEMO=synthetic-only`, behind the existing ACTIVE legacy Admin/session guard. A conditional Community → Case Brief · synthetic link appears only with that gate. Production refuses before rendering even with the flag configured. Normal staff roles remain inactive; legacy Admin access here grants no live AI or private-case read capability.

Four fully authored bilingual fixtures: borrower scheduling request; a separate owner's condition claim sharing a fictional rental label; embedded instructions/HTML requiring refusal; and a Traditional Chinese question whose scripted translation must not become an asserted handoff. IDs are synthetic names with no database mapping. All fixtures are deliberately bundled together for demonstration; selection separation is a display/evaluation contract, **not live data authorization**.

Open scripted example reads prewritten text locally. One cancellable animation frame exposes a local preparation state; it is not simulated inference or measured provider latency. The unavailable-state button deliberately demonstrates a fallback, not an actual outage. Sources remain readable; no fake successful answer appears. Reopening/switching asks before discarding edited drafts. Locale changes preserve the draft and its actual language label. Reload/unmount loses draft/review state; neither is persisted or audited. Users are explicitly told not to enter real private information.

## Design and human review

A restrained research notebook reuses existing paper/soil palettes, optimized grain, editorial serif headings, fine ruled columns and clean controls. It sits inside the retained Admin shell; this is not a full Admin redesign or translation. Two-column source/working ledger on wide screens stacks on smaller screens. Citation links focus the exact source, state feedback receives focus, controls have 44px targets, and sensitive work has no particles, audio or decorative animation. Theme/language controls reuse the existing foundation; its sound/effects preferences do not introduce effects here. No new artwork, stock imagery, font or provider SDK.

Review questions: Does the brief help distinguish claims from facts? Are uncertainty and sources easy to inspect? Is the draft useful without implying a binding decision? Does switching language preserve work? Can reviewers understand that no actual model ran? Collect feedback before selecting a provider or expanding the surface.
