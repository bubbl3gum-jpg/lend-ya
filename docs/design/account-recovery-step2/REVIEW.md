# Account Recovery Milestone 3 — Step 2 review

Status: implemented and verified locally; visual review pending. Step 3 has not begun.
Branch: `integration/account-recovery-milestones-1-2`.
Approved baseline: `0517551156fcd37f914377ce5570a31b1748f4ff`.
The implementation SHA is the commit containing this report (see Git history).

## Implemented

`/reset-password` extends the existing AuthShell with a reset-specific section label
and scoped controls. It retains the approved parchment, wheat artwork, typography,
olive/walnut tokens and appearance behavior. Six existing login/request captures
are **pixel-identical** to the approved images; see [comparison](baseline-comparison.json).
The shared shell's existing defaults and approved page markup remain unchanged.

The browser accepts only one canonical 32-byte base64url token in `#token=...`.
It removes the fragment and query from the current history entry before using the
credential. Query-only, duplicate, extra-field and malformed credentials are
refused. The token is held only in a ref, never rendered into markup or persisted
to storage/router props. History removal failure prevents reset processing. Reopening
a fresh email fragment in the same document is supported; changing a link during
submission produces uncertainty rather than another reset. Leaving or restoring a
cached page clears secrets; refresh requires reopening the email link.

Password and confirmation use the existing browser-safe password policy without
trimming or silent truncation. Required/policy/mismatch feedback identifies and
focuses the relevant field. Independent Show/Hide buttons are keyboard operable,
labelled and expose their pressed state. Paste and password-manager autocomplete
remain available. Pending state disables fields/toggles and fences duplicate submits.

Only explicit form submission invokes the unchanged reset API. Opening a valid-looking
link does not consume or validate it on the server; expired/used status is learned
on submission. Missing/malformed and server-rejected links offer a fresh-link route.
Success is shown only for the existing API's exact successful response, clears all
sensitive form state, announces/focuses confirmation and offers a fixed full-document
return to sign-in. There is no automatic login or caller-controlled redirect.

Network failure, 15s timeout, server unavailability or an unreadable success response
can follow a committed reset. Those cases clear secrets, explain that the password
**may have changed**, and offer sign-in/new-link actions. They never claim the old
password is unchanged, automatically replay the request, or leave a reset button
that could resubmit stale credentials. Refused cross-origin/security requests have
safe unavailable feedback; raw server errors are not displayed.

Reset-page responses have no-referrer, no-store and noindex protection. Reset request
URLs are excluded from Next development request logging, including accidental query
credentials. The page also declares no-referrer/noindex metadata. Authentication
APIs, hashing, token lifetime/eligibility/single-use transactions, session revocation,
outbox/notification behavior and schema/migrations were not changed.

## Verification

| Check | Result |
| --- | --- |
| `npm run test:unit` | PASS, 234 passed, 0 failed/skipped; includes 2 new fragment-parsing tests |
| `npm run test:password-reset-ui` | PASS, 9 grouped focused browser/API checks; run `397d6fc4865ed6f1f786a903` |
| `npm run test:recovery-request-ui` | PASS, 11 existing groups; run `0245146c9d975ea719c601dc` |
| `npm run test:recovery` | PASS, existing security/API regression; run `5e517a78105b01993cf47afc` |
| `npm run test:email` | PASS, existing simulated-provider integration; run `d06c439a53dcec4ef90c59e7` |
| `npm run typecheck` | PASS, complete Next route generation and TypeScript |
| `npm run lint` | PASS |
| `npm run build:verify` | PASS, full optimized build using owned database; run `c96a804b8e7a26c18c7e1746` |
| Automated accessibility | 16 scans, 0 reported violations, with contrast limitations below |
| Isolation/cleanup | All runner/inspection databases removed; final `hustlen_test_*` count 0; partial development database still has 0 users |

The focused suite verifies app/database identity before fixture mutation. It prepares
synthetic recovery credentials internally, with email disabled and fake provider
credentials. It does not execute the request → email link → reset → sign-in acceptance
journey reserved for Step 3. Real API reset checks verify exact password preservation
(including spaces), token consumption, all target sessions revoked, browser cookie
cleared, no automatic authentication and no queued mail in disabled mode. Expired and
used credentials yield the same UI, with an expired reset preserving the old hash.

A real reset is deliberately committed behind an intercepted response. The browser
times out into the uncertainty state, while the database proves the password changed
and token was consumed. Exactly one browser reset submission occurs. Additional
checks cover duplicate pending submissions, 403/503/network/unreadable-response
handling, field focus, visibility controls, reload/back/cache restoration, same-page
fragment reopening, URL/DOM/storage/history/console/server-log privacy, 320/390/1440px
viewports and zero browser exceptions. The existing Step 1 test's historical reset
404 assertion now expects 200; the new suite verifies safe invalid-link behavior.

## Accessibility and screenshots

Existing labels, landmarks, visible focus and status/error semantics are reused.
Password text is 16px; Show/Hide controls are at least 48×44px and the primary action
is at least 48px tall. Reduced-motion behavior is inherited without new animations.
No horizontal overflow was found at 320px or 390px in light/dark themes.

The [accessibility scan](accessibility.json) covers form, invalid-link, success and
uncertain states in light/dark at desktop/mobile widths. Transport is simulated for
those DOM scans only; successful-reset screenshots below come from the real API
fixture. Axe cannot automatically evaluate contrast through texture pseudo-elements.
The existing token pairs were separately calculated and visually reviewed in Step 1;
new controls reuse those pairs. Hardware screen-reader and physical-device checks
have not been performed. These results are not a full accessibility certification.

Screenshots are actual isolated application captures using synthetic fixtures. Only
the Next development toolbar is hidden. Focus rings and application feedback remain
visible. Inline-validation captures use a synthetic fragment with zero reset POSTs.

| State | Desktop | Mobile |
| --- | --- | --- |
| New password | [Light](screenshots/reset-form-desktop.png) · [Dark](screenshots/reset-form-desktop-dark.png) | [Light](screenshots/reset-form-mobile.png) · [Dark](screenshots/reset-form-mobile-dark.png) |
| Password validation | [View](screenshots/reset-validation-desktop.png) | [View](screenshots/reset-validation-mobile.png) |
| Successful reset | [View](screenshots/reset-success-desktop.png) | [View](screenshots/reset-success-mobile.png) |
| Invalid/missing link | [View](screenshots/reset-invalid-desktop.png) | [View](screenshots/reset-invalid-mobile.png) |
| Uncertain outcome | [View](screenshots/reset-uncertain-desktop.png) | [View](screenshots/reset-uncertain-mobile.png) |

## Boundaries and remaining work

No known failing functional check remains for Step 2. Visual approval is pending.
Step 3 end-to-end acceptance remains a separately approved task. No live email was
sent, worker started, production/shared database changed, branch merged, code pushed,
deployment made or environment configuration published. Default email delivery remains
disabled. No new dependencies or unrelated marketplace changes were introduced.
