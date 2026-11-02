# Hustlen’ — product capabilities

2 November 2026, Asia/Taipei. Unified **development demo candidate**, not production acceptance.

Hustlen’ is a peer-to-peer physical-item rental marketplace. Owners document/list items, set daily prices and display deposits, and choose supported MRT meeting stations. Borrowers discover eligible items, review a dated quotation and request a rental. Owners accept/reject; the existing bilateral pickup/return protocol requires checklists, consent, evidence and QR/receipt confirmation. Owner inspection and participant disputes remain distinct from physical custody and financial settlement.

| Capability | Honest status / destination |
|---|---|
| Register, sign in/out, profile name, current-session security | Implemented core; native session tests in fresh ledger. `/login`, `/register`, `/account`; password recovery unavailable, password-change candidate gated. |
| Home, Browse/category/station discovery, listing detail/create/edit | Implemented core; new primary List an item/My rentals links. `/`, `/listings`, `/listings/new`, `/dashboard`. USD remains the current display denomination, not TWD. |
| MRT | Existing integrated120-location snapshot and owner/borrower selector, not another service. No live station/exits or production station-control claim. |
| Booking, pickup, return, inspection and reviews | Implemented guarded lifecycle; actual test coverage/remaining failures are in COMPLETE_TEST_REPORT.md. Pending handoff is not in-use; return submission is not physical receipt. |
| Private messages/moderation | Implemented gated chat; only exact participants and explicit enabled ChatReviewer authority. Messages link is conditional. |
| Reporting/disputes/Admin | Existing ACTIVE legacy Admin workspace and audited actions; no new role activated. Ordinary users denied; private evidence needs dedicated authorization. |
| Support | Public Help explains steps. Ticket/private-channel/worker/recovery candidates remain exact-owned-development only. Receipt ≠ human response. |
| Local Qwen Customer Service | Existing fictional-only native-login demo, fixed scenarios and bounded playground. Fresh mock tests ≠ genuine Qwen quality. Genuine testing blocked on local Mac/Ollama availability. |
| Appearance/localization | Existing heritage materials, local serif/support typography, Light/Dark/System, optional effects/sound OFF by default; selected en/zh-TW surfaces, not whole-site bilingual delivery. Visual owner acceptance pending. |
| Item studio/claims/identity/approvals/settings/announcements | Preserved bounded development foundations, not activated production powers or policies. |
| Vision/translation | Existing inactive/mock/dormant experiments retained. Not expanded, downloaded or genuinely executed here. No photo understanding claim. |
| Payments/autonomous actions | Not implemented/activated. Displayed deposits do not constitute a hold, escrow, refund or deduction. |

Source-backed complete inventory: FULL_FUNCTIONALITY_AUDIT.md and consolidation-20261102/ENTRY_POINTS.md. Status must be read alongside the dated fresh test ledger and remaining blockers, not inferred from feature names.
