# Lend Ya — University demonstration guide

The supported rental and administrative workflows passed real API/database/browser tests. Demonstration readiness is conditional on preparing the local environment and addressing the documented operational/advisory conditions in the final report. This guide uses application controls; never assign booking states or manipulate evidence in SQL.

## Prepare safely

1. Use a separate demonstration PostgreSQL database, such as `lend_ya_demo`, with no real personal data. Create it without dropping/resetting an existing database; choose a new name if it already contains information. Keep the existing application database intact.
2. Set `DEMO_DATABASE_URL` privately to that database's connection and export `DATABASE_URL="$DEMO_DATABASE_URL"` in the terminal used for this demonstration. Do not print/share connection credentials or replace another developer's environment file.
3. Use Node 24, npm, PostgreSQL 17, FFmpeg/ffprobe and a modern browser. Run `npm ci`, `npx prisma generate --config prisma7.config.ts` and `npx prisma migrate deploy --config prisma7.config.ts`. Start `npm run dev`. Confirm that the public listing API responds with PostgreSQL-backed JSON. If dependencies require restricted network access, the setup needs the npm registry, Prisma binaries and Google Fonts endpoints described in the cloud configuration.
4. Register three fresh accounts through `/register`: Owner, Borrower and Administrator. Choose your own credentials; do not reuse public seed/demo passwords. In the same demonstration environment run `npm run admin:create -- your-admin-email` to promote only the existing administrator account. This local-only script refuses production/nonlocal hosts and does not change the password. Log that account in again through `/login`; it should reach `/admin`.
5. Open three independent browser profiles/contexts. Tabs in one profile share a session, including incognito tabs, so separate tabs alone are insufficient for separate participants. Keep Owner, Borrower and ADMIN clearly labeled.
6. Prepare two physical-item listings with your own harmless JPG/PNG/WebP photos: one for normal completion, one for a contested return. Use JPEG/PNG/WebP under 10 MB, at most 8 photos; condition-evidence photos have the separate 5 MB/20 MB limits. Existing migration pickup stations are available without needing seeded user accounts.
7. Choose future rental dates within 90 days. Input/display uses Asia/Taipei. A period of exactly 24 hours costs one day; 24 hours plus one minute costs two days. Deposit is a recorded snapshot, not a payment or transferred balance.

## Demo 1 — Normal rental

1. Owner opens `/listings/new`, supplies title/category/description/condition/price/deposit, uploads a photo and selects a pickup station. Publish the listing. Optionally edit its category or station to demonstrate management.
2. Borrower uses `/listings`, searches the item and filters category/station. Open details, select future Taipei dates and a supported station, then review the server quotation. Confirm the rental request; show PENDING and the price/deposit snapshot.
3. Owner opens the incoming request from `/dashboard`. Accept it and show CONFIRMED. A second overlapping request may remain pending, but conflicting acceptance is rejected; rejected/cancelled requests remain in history.
4. Owner records handoff notes, the five checklist responses, optional serial/photo evidence, and explicitly checks the acknowledgement. Submit; show HANDOFF_PENDING.
5. Borrower reviews the owner's evidence and records a separate receipt statement/checklist/photo if desired. Explicitly acknowledge receipt; show IN_USE. Neither account can act for the other.
6. Borrower records return notes/checklist/photos and explicitly confirms return. Show RETURN_PENDING. Owner enters inspection, reviews earlier and returned evidence, records a separate checklist/notes and chooses acceptable condition. Explicitly acknowledge and submit; show COMPLETED.
7. Both participants leave eligible reviews. Show persisted comments on the booking and the correct received-review profiles. Duplicate or premature reviews are rejected.
8. Refresh both dashboards and open historical booking details. Evidence stays accessible to those participants; an unrelated browser cannot open private condition-photo links. Optionally restart the application server (keep PostgreSQL and media storage running) and reopen the record to show persistence.

## Demo 2 — Administration and reports

1. ADMIN logs in normally and opens `/admin`. Show real counts and users/listings/bookings directories, search, filters, pagination and details. Use `/admin/audit-logs` to explain who/what/when/why and before/after state.
2. Borrower reports a separate eligible listing using the Report control in the browsing card. Confirm pending review on `/dashboard` and show its admin report detail.
3. ADMIN reviews the original allegation and listing. Enter a reason and explicitly confirm DISMISS or UPHOLD. An upheld report restricts the listing; it remains in history and cannot accept new bookings.
4. Owner's attempt to reactivate/edit a restricted listing is rejected. ADMIN may remove only the administrative restriction, with another required reason/audit record. Unresolved reports, owner inactivity/suspension, missing media and reservations still govern eligibility.
5. Optionally suspend a fresh normal account, show its banner and blocked new activity, then reactivate it. Existing return/inspection obligations remain available. Standard moderation cannot suspend the current ADMIN or another ADMIN.

## Demo 3 — Contested return and investigation

1. Use the second listing and repeat request, acceptance, owner handoff, borrower receipt and return through their real forms. Record a visible condition discrepancy in participant statements; allegations are not automatically findings.
2. Owner enters inspection and records “problem found,” with notes/checklist/photo and acknowledgement. It remains incomplete. An eligible participant opens a dispute; show DISPUTED and preserved original statements.
3. ADMIN opens `/admin/disputes`, selects the case and inspects attributed owner/borrower evidence. Protected condition-photo access requires the administrator session; unrelated users are denied.
4. Select a supported finding, enter the participant-visible decision explanation, optionally enter confidential internal notes, and choose a consequence. For this actually returned and owner-inspected item, choose CLOSE_RETURNED. Confirm explicitly.
5. Show RESOLVED and ADMIN_CLOSED. The original negative inspection and unconfirmed condition fields remain intact. Both participants see the appropriate decision summary; confidential notes remain admin-only. Show the transactional audit entry.
6. Explain the other consequences: CONTINUE_RETURN is allowed only when no return exists and leaves the item IN_USE; RESUME_INSPECTION needs an acknowledged submitted return without a recorded inspection and returns to RETURN_PENDING. Missing evidence is never fabricated. No payment, forfeiture, refund or legal settlement occurs.

## Checklist before presenting

- PostgreSQL ready; migrations/generation complete; API responds functionally.
- ffprobe available if demonstrating optional video.
- New listing media exists under `storage/listings`; database backups include condition-evidence bytes.
- Owner, Borrower and ADMIN are independent sessions with chosen credentials.
- Future Taipei dates, correct station, understood quotation and deposit snapshot.
- Two listings, valid photos and short participant statements ready.
- Normal completion and review controls visible; contested-return finding/outcome understood.
- Admin report/dispute/audit routes available; no real-user data shown on screen.
- Reported dependency advisories and operational limits are acknowledged; no production-security claim.

## Recover an interrupted demonstration

Restart only the application process you launched, reconnect it to the same demo database and storage, then open the existing booking from the relevant dashboard. Read its persisted state and use only the next permitted participant action. Submitted checklists/notes/photos and decisions are immutable; avoid blindly resubmitting them. If already completed or administratively closed, display history instead of trying to reopen it.

If a confirmation/report decision changed while the page was open, refresh and read the authoritative current state. A 409 is an integrity safeguard. A lost session can log in again with the chosen account; do not reset credentials in PostgreSQL. If a user is suspended or a listing restricted, the ADMIN can review and perform a supported reactivation/restoration with an audit reason. Return/inspection duties are still available.

If a period conflicts with an existing rental, finish/resolve that actual obligation or use another listing. Cancellation is allowed only before handoff; never reset an active rental. If original legacy evidence is missing, choose a new current-workflow demonstration fixture rather than inventing confirmation or forcing COMPLETED. If storage/DB restoration fails, report the interruption and use previously captured verification evidence clearly labeled as such; never describe a screenshot as a live successful operation.

Automated regression commands and isolated database preparation are in README. `test:moderation`, `test:migration` and `test:mvp` intentionally clear only dedicated, guarded test data; never point them at the demo or application database. No post-MVP development or hosted deployment is part of this guide.
