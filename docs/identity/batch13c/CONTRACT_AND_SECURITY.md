# Identity contracts and security boundary

## Authority and state

Agreed future policy: register/login/browse without eKYC; genuine verification before publishing or submitting a new rental request. Initially intended Taiwan National ID and ARC, subject to validated versions/provider capability. Document authenticity, fresh live liveness and face-to-document match must **all** be established. OCR or an existing trust badge is insufficient. Not production policy activation.

`lib/identity/contracts.ts` defines NOT_STARTED → PENDING → VERIFIED / RETRY_REQUIRED / MANUAL_REVIEW / REJECTED; VERIFIED may become EXPIRED or REVOKED. REVOKED is an explicit extension to the requested seven states. The old inert 13B IN_PROGRESS spelling corresponds to 13C PENDING; neither contract grants production authority or creates a second authentication system. Pending has scripted DOCUMENT → LIVENESS → MATCH steps. Retry starts a new attempt. A rejected or manual-review fixture may start a new **synthetic** attempt; this does not define production appeal/retry authority.

Future result contract binds actual user/attempt, country/document/version, policy/provider reference, result times/expiry/invalidation and distinct authenticity/liveness/match outcomes. A genuine VERIFIED transition additionally needs a server-validated, signed, anti-replay provider attestation tied to a nonce/attempt/user/session, approved provider/key/algorithm/issuer/audience, explicit successful assurance checks and current versioned document policy. Require trusted callback authenticity, timestamp bounds, replay ledger, transactional compare-and-swap, immutable safe event history and result/expiry/revocation consistency. No such adapter, callback, staff override or VERIFIED writer exists in this batch.

`futureParticipationEligibility` always denies (including synthetic VERIFIED, forged provider data and ordinary boolean flags). It is **not installed** in marketplace routes, so it causes no production lockout. The unchanged 13B unavailable guard still always throws. Browser/client values, cookies, session authentication, staff roles and fixture success cannot manufacture trusted eKYC. Future production result reads must use exact account scope and database-bound policy, not accept an input result as authorization.

## Working development candidate

- `/account/identity`, linked only when the full owned-development check passes from `/account/verification`.
- `/api/dev/identity` GET/POST. No selector on GET; closed command schema, no free text, documents, images, user IDs, outcome or provider callbacks.
- NODE_ENV exactly development AND HUSTLEN_IDENTITY_CANDIDATE=`owned-synthetic-only`; independent proxy and service refusal in production even with configured flag/provider-looking environment values.
- Three exact matching test URLs, strict local `hustlen_test_*` URL and PG-override guard, 24hex run ID, actual current_database and matching ownership comment, valid current persisted session and ACTIVE account. No ADMIN/staff bypass.
- Mutation origin is a single configured exact localhost origin matching request URL and Origin; custom X-Hustlen-Identity:1 header; cross-site denied; exact application/json; existing streamed 32KiB maximum reader; exact bounded command enums/integers/UUIDs; no unrestricted JSON storage.
- Re-resolve actual account/session immediately before synchronous state transition. Session incarnation is an internal key only; never return/hash-log raw cookie. Revocation denies subsequent requests. As elsewhere, this is not universal cancellation of previously authorized work. No production-authoritative side effect can occur in this simulator.
- Ephemeral global development-process store, at most 128 session records; absolute 30-minute removal via unref timer plus expiry sweep (event loop scheduling may delay physical timer execution; access checks still enforce absolute expiry). At most 60 mutation attempts per record; over limit returns429, capacity503. Latest24 fixed history events only; returned values are clones; expectedVersion rejects stale/concurrent edits. No durable database outcome, grant or audit is created.
- Restart/new login resets the demonstration; no multi-process consistency guarantee. These constraints make it unsuitable as a production verifier. Synthetic state can survive development hot reload within the same process only.
- Simulated VERIFIED expires after five minutes, checked server-side at access; not a browser timer. REVOKE clears its synthetic challenge. GET is private/no-store/Vary Cookie, no tokens/emails/names/identity records.
- Six exact authored scenarios: SUCCESS, DOCUMENT_RETRY, LIVENESS_RETRY, MATCH_RETRY, MANUAL_REVIEW, REJECTED. The user selects a clearly labelled script, **not a real verification result**. Server controls transitions/results; no image or face is processed. Failure is not a fraud finding.

## Event demonstration vs future real challenge

Authenticated participant supplies only booking ID. Server reads actual own booking; HANDOFF_PENDING selects PICKUP, RETURN_PENDING selects RETURN; IN_USE and all other states denied. Server issues random UUID, fixed synthetic challenge kind, session/account binding and 120-second half-open expiry. Completion requires exact challenge/version, same valid actor/session, still-applicable booking purpose and unused challenge. Concurrent completion has one success; replay/expiry/revocation/session change fail. This is **script completion**, never provider liveness/identity or physical custody proof. It writes no booking, MeetupEvent, receipt or evidence and cannot bypass real QR/GPS/camera/consent.

Future actual challenges need independently reviewed server random selection/policy, real evaluated anti-spoofing/liveness, nonce/attestation validation, immutable completion/replay record, accessibility/controlled exceptions and transactional coupling to the appropriate stage. No arbitrary mid-rental surveillance. Synthetic demonstration is not evidence of biometric anti-spoofing or genuine randomness quality; current kind is fixed and explicitly no-camera.

## Threats and controls

| Threat | Current boundary | Remaining production work |
| --- | --- | --- |
| forged verified flag/provider callback | Unknown fields/actions rejected; no callback endpoint or authoritative writer; inert eligibility | Signed provider callbacks, key rotation/replay and restricted transition transactions |
| other user/session state | No account selector; actual session internal key; own booking query | Durable scoped result/principal design |
| fixture escape / flag mistake | Production proxy + service refusal; actual owned DB checks | Independently reviewed migration/cutover, no fixture promotion |
| CSRF / cross-site command | Exact Origin/header/URL + JSON; generic errors | Approved HTTPS ingress/origin registry and deployment checks |
| replay/concurrent commands | expectedVersion and synchronous process transition; single-use challenge | Durable atomic provider/session/result consistency |
| sensitive uploads / logs | No upload or freeform personal fields; fixed operational error metadata only | Provider data minimization, audited restricted review/retention |
| DoS / retention | Bounded streamed input,128 records,60 commands/session,24 events, absolute TTL | Production shared limits/monitoring and incident response |
| forged document / deepfake | **No real detection exists or is claimed** | Provider evaluation against relevant document/liveness attacks |
| synthetic success bypasses custody | No domain write or production eligibility integration | Preserve separate existing QR/GPS/consent/evidence requirements |

No egress client, SDK, model, biometric library, credential activation or provider network call is introduced. Browser-origin capture and source audit support this narrow claim; there is no new process-level network sandbox or proof of all transitive application traffic. Existing local PostgreSQL/Next requests are expected.
