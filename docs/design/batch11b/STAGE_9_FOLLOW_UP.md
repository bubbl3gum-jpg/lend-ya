# Stage 9 follow-up proposal after Batch 11B

Stage 9 remains **In Progress**. R1 is a meaningful provisional direction, not final product-owner visual approval. Batch 11B integrates that direction into home/shared navigation; no further comprehensive redesign is implied.

## Proposed small increments

| Increment | Concrete work | Gate and acceptance |
| --- | --- | --- |
| Account/profile audit | Inventory actual profile/name/avatar/public-vs-private fields and password/forgot-password flows; record functioning endpoints versus placeholders. Review loading, dirty/error states, focus and safe navigation. | Read-only audit first. Do not imply a working reset/recovery flow or implement password/security changes under a visual mandate. |
| Locale policy and content inventory | Present exact proposal for English + Traditional Chinese (`en`, `zh-TW` / final locale identifier to approve), initial default, user/browser preference precedence, persistence, route semantics and explicit fallback. Inventory strings including validation, warnings, dates, MRT labels and Support. | Product approval before runtime selector. No fake language toggle or claim of full localization. Do not auto-translate legal/safety/security/custody wording without review. |
| Locale implementation candidate | Add approved message catalogs and typed keys for one vertical slice: homepage, shared navigation and account labels. Define deterministic English fallback for missing translations only if approved; log bounded missing-key diagnostics without user text. Use Taiwan time consistently where operational dates already use it. | Exact locale/fallback/content ownership policy approved; keyboard/label/long-text/mobile tests in both languages. No booking/session/authorization logic changes or inferred currency conversion. |
| Remaining screen consistency | Incrementally adapt retained account activity/trust/profile and selected existing marketplace screens to current tokens, preserving status colors, evidence controls and MRT line identity. | Review one slice at a time, including headings, existing trust-tab behavior, 200% zoom and empty/error states; no all-site restyling claim. |
| Accessibility/device acceptance | Physical Android/iOS Safari, keyboard/screen-reader/zoom, focus return, contrast on real devices, real phone performance and comfortable optional audio. | Record actual hardware and outcomes; current Chromium screenshots are not certification. |
| Visual refinements | Collect owner feedback on provisional typography/materials/spacing before bounded refinements. | No direction is permanently approved by this batch. No new aesthetic system or wider Admin makeover without scope. |
| Login reliability | Reproduce R1 timing under bounded controlled cold/warm/concurrent workloads, retaining original deadlines and request/session/navigation evidence. | Separate focused reliability work if needed; green serial runs do not establish root-cause closure. |

## Operational boundaries stay separate

Stage 6 station suspension/restoration remains unfinished. Stage 7 Support production policy/activation remains blocked. Stage 8 publishing and production settings approval remains unresolved. Language/visual work must not activate staff, Support, station mutations, high-risk approvals, payments or AI. The original 14-stage roadmap and engineering batch numbering remain distinct.
