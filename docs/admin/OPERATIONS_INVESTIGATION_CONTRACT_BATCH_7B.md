# Shared queue/detail investigation contract — Batch 7B

This is a read-only extension for existing ACTIVE legacy Admins. Starting implementation: Batch 7A `fe83e274ba93183d6b083bd13184015c21a3dc52`. Its [six queue contracts](OPERATIONS_WORKBENCH_QUEUE_CONTRACTS_BATCH_7A.md) remain authoritative and unchanged in eligibility/count semantics.

## Common source of truth

`lib/admin/workbench-sql.ts` contains `queueRows(asOf)` and `bookingCheckpointRows(includeReceiptPaths)`. Both Workbench and detail investigation use these fragments, with bound parameters and server-derived time. `workbench-catalog.ts` supplies the same typed categories/reason labels. The original Workbench re-exports its public catalog so callers remain compatible. [Extraction evidence](../security/batch7b/shared-predicate-preservation.json) compares the entire six-category SQL tail byte-for-byte and verifies every original checkpoint predicate literal. Only href navigation changes in the original Workbench DTO.

The shared booking predicates remain:

- Bilateral handoff: correct owner performer and borrower confirmer; both condition acknowledgements; confirmation timestamp.
- Borrower-submitted return: correct borrower initiator and explicit return acknowledgement.
- Owner-recorded physical return: submitted return plus correct owner confirmer and confirmation timestamp.
- QR-recorded physical return: actual persisted RETURN challenge for this booking, verified by the owner, consumed and completed with completion hash. Mere scan/consumption, a query flag or a booking status is insufficient. Historical completion does not expire merely because its old challenge window later expires.
- Physical return is the existing **owner-recorded OR QR-recorded** predicate. Detail queries expose which path supports that boolean, without selecting challenge secrets, proofs, coordinates or evidence.
- Owner-accepted inspection: owner inspector, inspection timestamp and acceptance true.
- Open dispute is the same persisted OPEN-exists test. The detail additionally counts RESOLVED disputes. Administrative closure is stated only when current Booking.status = ADMIN_CLOSED and never supplies a receipt.

Missing or contradictory rows produce “Not established by current records,” not an allegation or automatic repair. COMPLETED alone supplies no confirmation. A legacy INSPECTION with a submitted return is not automatically a custody anomaly. A resolved dispute is not physical return, and submission is not inspection acceptance. Normal/legacy and QR paths remain separate, preserving Batch 7A semantics rather than inventing enforcement rules.

## Trusted detail read

`lib/admin/investigation.ts:getInvestigationSummary(kind, rawId)` is server-only. It independently resolves the current authenticated User, requires ACTIVE legacy ADMIN, validates a fixed record kind and positive route ID, then reads a Repeatable Read transaction. It accepts **no navigation object, actor, role, origin, assurance or resource selector** beyond the existing detail route's kind/ID. Page guards and existing detail existence checks remain in place; the context component also requires the existing Admin page guard.

Within one snapshot, the service selects minimal primary record status/relationship, current `queueRows` matches for exactly its kind/ID, and the shared booking checkpoints or listing restriction/open-report count. Cases derive their parent IDs from their actual persisted relationship, never a browser field. Fixed constant query calls per detail; no per-case or per-match database loop. Shared queue evaluation may still scan larger source sets; no production-scale/index claim is made.

Additional DTO allowlist:

- `kind,id,status,asOf`.
- `matches[]`: current category and fixed reason codes only.
- `booking`: handoff, submittedReturn, physicalReturn, ownerReceipt, qrReceipt, acceptedInspection, openDispute, resolvedDisputes and adminClosed; booleans/count only, or null.
- `listing`: restricted and openReports; boolean/count only, or null.
- `related`: persisted parent kind/ID and fixed local guarded href, or null.

No title, contact/participant identity, case text, evidence bytes, geolocation, raw credential/challenge/hash or free-form investigation content is added. Existing full details retain their existing independent authorization and protected evidence routes. There is no new API, mutation, database model or migration.

## Closed navigation envelope

`workbench-navigation.ts` is a pure, separately tested navigation helper. Workbench links are a fixed local `/admin/{bookings|listings|reports|disputes}/{positive ID}` plus only:

| Parameter | Meaning and validation |
| --- | --- |
| `wbCategory` | Own key of the six-category registry; required for a supplied valid view. |
| `wbRecordId` | Optional original exact queue-record filter, positive decimal integer through 2147483647. Not the detail's record selector. |
| `wbPage` | Original page; defaults 1, bounded 1–10000. |
| `wbPageSize` | Original page size; defaults 10, bounded 1–50. |

Unknown/repeated keys, non-decimal/out-of-range values, inherited category names, arbitrary local/external return URLs, authorization claims or private free text invalidate the entire envelope. Invalid or absent context never makes an otherwise valid direct detail fail. A static notice explains the discarded/absent view; Back always falls back to `/admin/workbench`.

A valid Back href is **constructed**, never copied: `/admin/workbench?category=…&page=…&pageSize=…[&recordId=…]`. All values are validated known labels/integers. No return origin/URL, narrative, identity selector, evidence pointer, credential or authorization is accepted. The sender validates its input too and cannot output an external/unrelated detail path. Unit tests cover round-trip, absent context, repeated/forged/external/private parameters and invalid paths.

The new panel's related Booking/Listing link carries the same valid return envelope. Its selected category can then describe a different record type: the UI explicitly labels this as **return view only / not applicable**, while showing that related record's own current queue matches. Existing legacy detail links remain ordinary direct links; they do not gain new authorization or private query parameters.

## Current-state language and UX

`components/admin/investigation-context.tsx` renders after the existing detail title, through an optional node slot in existing detail components. It adds no operational control. It shows evaluation time, current primary status, current criterion reasons, concise checkpoint explanations and safe Back navigation, reusing the Hustlen’ panels and typography. Existing complete rental/case/evidence/forms panels are not rebuilt.

For a same-type selected queue, the UI says **Currently matches** or **Not currently in the selected queue**. It explicitly warns that a link does not establish an earlier match. No original result, status, priority or “was problematic” assertion is trusted from the URL. A fresh read after a restriction/case-state change can show no current match. Snapshot fields are observations at read time, not a lock against subsequent changes or proof of a physical event beyond the persisted record.

An accessible Suspense loading surface shows no conclusions. An unavailable investigation read logs a bounded operational error/reference and renders an explicit “No checkpoint conclusions could be loaded” alert with a safe Back link; it does not replace unknown flags with false. Existing record details can remain available when only the investigation query fails. Authentication/authorization/not-found errors retain their existing denial behavior. Tests inject an owned-table fault to exercise this distinction.

## Cache and authorization boundary

Existing ACTIVE legacy Admin page/service guards stay mandatory. All Admin APIs and mutation/evidence guards are unchanged. No ADMIN-or-staff-role check, staff identity issuer, grant, recovery, sanction, custody editor, evidence change or approval execution is added. Dynamic detail routes are included in proxy's private/no-store matcher; the existing production-refusal and Origin/CSRF function is unchanged. Next owns development HTML cache/RSC variation headers; no-store remains required, and production build/route behavior is verified. Streaming loading envelopes may have HTTP 200 before a redirect/not-found, so tests require no protected context/checkpoints, not a false assumption that 200 means access.

Future Operations `listings.read` remains exactly granted Listing IDs and only `id,status,category,adminRestricted`, authenticated and audited. This legacy-Admin summary is not exposed to future staff accounts and does not activate that policy.
