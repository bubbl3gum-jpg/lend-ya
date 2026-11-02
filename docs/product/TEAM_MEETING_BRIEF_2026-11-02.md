# Hustlen’ — Team Meeting Brief (2 November 2026)

## One-sentence description
Hustlen’ is an item-rental marketplace where an owner lists a real item, a borrower requests a time and authorized MRT handoff station, both parties verify pickup and return, and administrators can handle safety/reporting. Local Qwen AI is an experimental customer-service advisor, not an automated decision maker.

## What we can show now (implementation evidence, pending integrated rehearsal)
1. **Marketplace:** account access, item listing/media, Browse filters and product detail.
2. **Booking:** requested dates → owner confirmation → handoff → active rental → return → inspection.
3. **Taipei MRT:** original map already integrated into `lend-ya`, including owner-approved pickup stations; no separate app required.
4. **Safety:** evidence/QR, reports, disputes, moderation and audit trails.
5. **Admin/Support:** dashboard, case/report operations, support and scoped recovery candidates; differentiate legacy verified pathways from synthetic gated pilots.
6. **Design:** balanced agricultural luxury direction implemented on parts of the marketplace, textured heritage style, English/Traditional Chinese in selected pages.
7. **AI:** local Qwen 3.5 9B experimental customer-service playground for fictional situations; genuine end-to-end acceptance still to be completed.

## Critical honesty points
- The latest **development** branch holds more features than `main`. They have NOT been consolidated/verified into a release.
- Main has one independent commit: integration must preserve its needed MRT changes.
- Standalone `mrt-map` is already integrated as an in-app feature, not a second app.
- No working payment or deposit custody; prices are only recorded and displayed.
- No real eKYC, production Vision AI, autonomous AI resolution or full bilingual rollout.
- Qwen mock tests are not proof of actual-model quality. Do not use real customer data in the sandbox.

## Proposed live demonstration, in narrative order
**Act 1 — Owner:** sign in → create a camera listing → select MRT pickup stations → publish.  
**Act 2 — Borrower:** Browse → inspect listing → select approved MRT station/time → request.  
**Act 3 — Rental:** owner accepts → evidence/QR pickup → borrower confirms → return → owner inspects.  
**Act 4 — Trust/Admin:** demonstrate a report/dispute and legitimate Admin-only review.  
**Act 5 — Optional AI:** ask local Qwen a clearly fictional rental dispute question and show source/uncertainty notices. If unavailable, explain the gate and show verified screenshots rather than simulate success.

## This meeting's decisions
- Confirm **scope freeze**: physical item rentals, not repairs/skills, payments or Vision.
- Agree integration branch is the team testing surface, not `main`.
- Assign owners for (A) backend/booking, (B) UI/navigation, (C) Qwen/local demo, (D) testing/runbook and presentation; adapt assignments to actual teammates.
- Set acceptance: a complete owner-and-borrower cycle, stable Admin view, honest Qwen demo and no dead-end user navigation.
- Approve QA-first PR only after disposable-DB tests, a whole-app smoke test and meeting demo sign-off.

## Short discussion script
“We've built much more than just a concept: item listings, booking lifecycle, the Taipei MRT station selector, QR/evidence workflows, Admin tools, and an experimental Qwen customer-service assistant. Our next milestone is not more features. It is bringing the existing development together, testing one full rental experience, fixing confusing navigation and producing one dependable demo. We are keeping Vision and payments separate until the core product is stable.”

**Evidence:** see `docs/product/INTEGRATION_AUDIT_2026-11-02.md`.  
**Readiness:** meeting brief based on code/document inspection, not a newly executed full-stack verification.
