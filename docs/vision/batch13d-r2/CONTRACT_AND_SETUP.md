# Rental documentation agreement candidate contract

29 October 2026, Asia/Taipei. Development candidate, not production approval.

## Authority and source references

`app/api/bookings/route.ts` remains the actual quote/request authority; `app/api/bookings/[id]/route.ts` remains owner acceptance. Existing account, listing, price/deposit, MRT, dates, availability, serialization and idempotency checks remain. `lib/rental-documentation/service.ts` is a narrowly called extension, not a second Booking writer. Original pickup, return, inspection and Support writers are unchanged.

`lib/item-studio/service.ts` and immutable `DevItemVersion` / `DevItemPhoto` are reused. Draft save, owner confirmation, borrower-review designation, borrower acknowledgement and owner acceptance are distinct. Explicit designation freezes the title and the canonical content digest; the version fixes category, checklist, declarations, confirmed/source timestamps and exact protected photo references/hashes. SHA256 recursively sorts object keys while retaining array order (`contracts.ts`). It is content identity, not physical authenticity or cryptographic human-signature proof.

## Additive data and atomic transitions

New `DevDocSelectionEvent` is append-only designation/withdrawal history; `DevDocSelection` is the current revision pointer. `DevDocReviewContext` stores exact quotation terms/digest, policy, current borrower/session and selected event. The database creates its timestamps and ten-minute expiry. `Booking` gains only nullable unique context FK and acknowledgement/acceptance timestamps; no old row is backfilled. Immutable context references the immutable event/version; there is no independently editable agreement copy.

Within existing serializable request creation, the service rechecks actual session, ACTIVE actor, current selection, exact version and all server-derived price/date/deposit/station/notes terms. Database trigger generates acknowledgement time during INSERT. A unique context prevents two distinct requests using one review. Existing idempotency-key/hash supports exact replay; retries return the original booking, not a new acknowledgement. Conflicting body/key fails. A lost response can retry with the original request; a changed review requires a new request key.

Existing owner acceptance calls the extension inside its real transaction. The selected event must still match. Database records acceptance time only during the authorized PENDING→CONFIRMED transition. Expiry limits new request submission, not subsequent owner acceptance/participant access to an already submitted immutable agreement. A changed selection before acceptance blocks it; cancel/reject and submit a newly reviewed request. There is no amendment endpoint. Later selection/listing changes cannot rewrite accepted content, material booking terms or timestamps. Existing cancellation and later rental/evidence transitions remain authoritative.

Migration `20261029090000_owned_rental_documentation` is new, explicitly transactional and forward-only. FKs/revision bounds/unique indexes, atomic deferred designation checks, immutable context/event and Booking guards prevent unbound history, mutation, deletion, truncation/backfill or forged timestamps. A failed Booking transaction rolls back acknowledgement. Privileged database administrators can disable triggers; this is not protection against arbitrary superuser SQL.

## Privacy and gates

Only `NODE_ENV=development` plus `HUSTLEN_RENTAL_DOCUMENTATION=owned-agreement-only` enables the service. Three exact validated local disposable URLs (`DATABASE_URL`, `TEST_DATABASE_URL`, `MRT_TEST_DATABASE_URL`), a 24-hex `MRT_TEST_RUN_ID`, and actual `current_database()` name/comment must match the ownership harness. Mutations require exact configured localhost `HUSTLEN_RENTAL_DOCUMENTATION_ORIGIN`, matching request URL/Origin, `X-Hustlen-Documentation-Agreement: 1`, no cross-site Fetch Metadata, closed payloads and persisted current session. Owner designation additionally requires R1 studio gate. Production proxy and service independently refuse, even with flags. No browser identity/hash/time/role is authoritative.

Prospective photo access needs the same current borrower session, unexpired review, unchanged designation and eligible listing/account/media/moderation state. Request creation still enforces full current availability/overlap independently. Booking participants can read only their exact bound version/media under current authentication, including after later designation/expiry. Suspended participants retain existing obligation reads; they cannot make a new acknowledgement. No broad Admin/Support bypass. No raw session tokens, private booking evidence or identity documents in DTOs. Responses are private/no-store with same-origin/nosniff headers. Contexts are not reusable across sessions or borrowers.

Application writes lock current User then AuthSession; listing request/acceptance already have existing listing locks. Designation and acceptance serialize on listing; PostgreSQL serializable/deadlock failures fail closed rather than binding mixed content. Revocation denies later requests, not universal cancellation of already-authorized transactions. Limits: 100 review contexts/borrower and 200 designation revisions/listing; original studio/photo bounds retained. No public listing activation or new production eligibility gate.

## UI and localization

`components/documentation-agreement.tsx`, `components/booking-form.tsx`, `lib/i18n/agreement.ts`: concise ruled heritage ledger, original declarations, accessory inclusion/exclusion/unknown/visibility, exact version/hash/times, private images, exact acknowledgement checkbox, explicit no-waiver/pickup-baseline notice. English and Traditional Chinese labels; user text/category/area identifiers are not silently translated. Existing rental form/station workflow outside the ledger remains English. R2 is not a full-site translation or aesthetic acceptance.

Studio has explicit version designation/withdrawal; withdraw keeps a pointer/history and blocks new pilot requests, rather than removing acknowledgement requirements. Existing booking/inspection/comparison surfaces show the actual acknowledged/accepted version only when R2 is enabled; historical rows explicitly UNKNOWN. No automatic latest selection.

## Safe setup, tests and cleanup

Use the existing owned test harness, never manually migrate a configured application database:

```
MRT_TEST_DATABASE_URL=<new local hustlen_test_* target> npm run test:rental-documentation
MRT_TEST_DATABASE_URL=<different new local hustlen_test_* target> npm run test:rental-documentation-production
```

The runner validates effective target/driver settings, CREATEs a new owned database (existing targets refused), adds ownership marker, sets exact flags/origin, deploys migrations there, starts application and records artifacts. It drops only that verified owned database and removes its recorded fixture uploads. Do not seed/reset/migrate an existing database or enable these flags on a shared application. Never paste credentials into logs or Git.

Candidate retained records are bounded and cleaned by owned database disposal; no in-app purge or production retention policy. Source version/photo RESTRICT FKs deliberately retain agreement history. Future account/listing deletion, ownership transfer, retention/holds and production principals need independent review. Feature-off preserves never-pilot legacy behavior, but is not a supported production migration or cutover for already documented rentals. No production deployment is authorized.

## Remaining product gates

Production policy/user communication/cutover for undocumented listings, retention/holds/deletion, threat review and physical-device/accessibility/product-owner acceptance. No replacement of original rental evidence; no liability waiver. 13B-R1 claim/response/qualifying delivery, Stage 6 station controls, Stage 7 activation and Stage 8 publishing/settings approvals, Stage 9 visual acceptance unchanged. No real eKYC/biometrics, live AI/Vision/egress, automatic publication, dispute submission, financial deduction, staff access or autonomous execution.
