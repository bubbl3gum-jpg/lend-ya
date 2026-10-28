# Verification scope, initial outcomes and limitations

Exact final commands, timings, artifact run IDs and exits are in `regression-ledger.json` and the main report after closeout. Each changing group uses its own newly created owned PostgreSQL DB; ordinary production build uses the current local/system font stacks, with NEXT_FONT_GOOGLE_MOCKED_RESPONSES absent. Existing evidence/authorization/deadlines/collectors are unchanged.

## Initial defects and corrections

1. Initial `tsc --noEmit` found two new-code errors: an unsupported second argument to the existing bounded JSON reader and discriminated-union narrowing in COMPLETE_CHALLENGE. Corrected to use the existing32KiB reader and explicit action branch; no auth changes.
2. First focused unit run:5/6. Static no-database-write regex matched crypto `.update` while hashing a session token. Narrowed the static assertion to Prisma mutation paths; no runtime code/boundary weakened.
3. Initial lint: synchronous state changes from initial fetch effect plus cleanup-ref warning. Corrected by providing the server-authorized initial snapshot; effect now only subscribes/cleans up focus refresh and aborts outstanding work. No disabled lint rules.
4. First real browser/HTTP run passed (14s test, fresh DB), before the final strengthened fixture/capture checks.
5. Strengthened run failed the unchanged strict collector on a React hydration mismatch. Trace showed screenshot-injected `style={caret-color:transparent}` while the shared preference shell remained `aria-busy=true`. Test now waits for the existing shell `aria-busy=false` readiness before capture. No timeout increase, generic console/network suppression, hydration-warning suppression or production behavior workaround. Initial failure is retained separately from rerun evidence.

## Focused coverage

| Requirement | Evidence / actual boundary |
| --- | --- |
| Anonymous/invalid/expired/deleted session | Real API401 and actual logout→subsequent401; persisted expiry fixture; no synthetic auth-success response |
| Own state / different user / different incarnation | Real separately registered actors and fresh native browser login; own-session initial state; no selectors; unknown userId400 |
| Forged success/provider/callback | Exact HTTP action/field rejection; no callback endpoint; inert future eligibility rejects every result |
| Wrong Origin/missing custom CSRF header/missing Origin/oversize | Real HTTP403/400; existing streamed size bound |
| All script outcomes | Real authenticated HTTP and pure stage tests; pending/document/liveness/match, retry/manual/rejected/success; no actual capture |
| Stale/concurrent edit | Two real HTTP next-step calls same expectedVersion → one200 and one409 |
| Synthetic expiry/revocation | Pure deterministic-clock half-open expiry tests, real HTTP revoke clears challenge; no provider expiry or wall-clock waiting claimed |
| Event participant/purpose | Own booking read, unrelated actor404, IN_USE409; actual HANDOFF_PENDING/PICKUP and RETURN_PENDING/RETURN fixtures |
| Challenge replay/expiry/session binding | Real completion/replay denial and other-session denial; exact120-second boundary in pure test, no real biometric assertion |
| Browse / future eligibility | Actual public listings GET200 without identity; inert future guard denies PUBLISH_LISTING/SUBMIT_RENTAL_REQUEST even with synthetic VERIFIED; existing rental/publication routes untouched |
| No synthetic identity authority | Existing User.identityVerified=false/verificationStatus=UNVERIFIED unchanged; no eKYC DB writer; no MeetupEvent created; booking unchanged by synthetic completion |
| Existing custody | Real handoff mutation still rejects missing evidence/requirements after synthetic challenge completion; full original virtual-camera suite rerun separately |
| Sensitive collection / egress | No upload/freeform content accepted, no identity document/biometric DB writes/client/SDK/HTTP provider path; positive browser requests have no external origin. This is source/browser evidence, not a universal network sandbox certification |
| Database isolation | Actual marker mismatch refuses404 then fixture ownership restored; shared existing disposable URL/PG override guard tests; all changing runs via ownership harness |
| Production | Actual next build/start with candidate and provider-looking variables configured; both page/API GET and POST404/no-store. No live credential or billable request |
| UI/localization | Native actual login, account Verification entry, scripted controls, reload state, desktop1440/tablet820/mobile390, en/zh-TW, overflow/focus checks and strict collector |

## Limits

Synthetic outcome and event history are in-memory, session scoped and bounded; **not** authoritative identity persistence, immutable audit, cross-worker consistency, provider callback verification, liveness/face matching, document authenticity, government database access or production eligibility. There is no real ID dataset, provider attack evaluation, biometric fairness/accessibility validation or vendor approval.

Screen/browser checks are not complete WCAG conformance, real-device performance, screen-reader certification or product-owner aesthetic acceptance. Existing Stage 9 design remains provisional. Some fixed operational history/purpose codes remain English identifiers with localised surrounding UI. No dark-specific visual acceptance is claimed.

Initial failure and final pass are distinct. Selected passes do not erase the historical overlapping-workload login intermittence. No changes to its assertions/deadlines or existing global browser error collector. Existing 13B late/expired inspection pure-boundary limitations, delivery semantics and durable claim/response blockers remain.
