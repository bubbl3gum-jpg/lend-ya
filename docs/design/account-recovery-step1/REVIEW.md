# Account Recovery Milestone 3 — Step 1 review

Status: implemented and verified locally; product-owner visual review pending.
Branch: `integration/account-recovery-milestones-1-2`.
Baseline: `5b3a1d67a40ca3d7fba1c070b0b6cbd563a25147`.
The implementation commit is the commit containing this report (see Git history).

## Behavior and scope

Login and the new `/forgot-password` page share the existing HeritageSurface,
appearance preference, WheatMark, local serif/support typography, parchment grain,
paper fibers, olive/walnut tokens and ruled editorial structure. Styles are scoped
under `.auth-entry`. Light, Dark and System inherit the existing appearance policy;
this step is English-only. No external fonts, new product dependencies or sound/
particle effects were added. Registration keeps its existing visual presentation.

The login modal is replaced by a real keyboard-accessible recovery link. The
existing login endpoint, hydration readiness, session handling and fixed full-
document USER/ADMIN destinations remain authoritative. Login errors receive focus;
network or unreadable responses have clear fallback messages. The shared form adds
a duplicate-submit fence and standard autocomplete hints without persisting input.

The request form submits `{email}` to the existing endpoint. Native email validation,
pending state, focused neutral confirmation, change-email focus restoration and a
one-minute local resend cooldown support the flow. HTTP 400, 429, 503, other server
errors and network failure have distinct safe feedback and preserve input. A 15s
timeout describes an ambiguous request outcome and imposes a cooldown; no request is
automatically replayed. Countdown derives from elapsed time; server limits remain
authoritative. Neither HTTP 202 nor the UI claims delivery or account existence.

No APIs, password policy, eligibility rules, token/security logic, database schema,
migrations, email adapter, worker or live environment settings were changed. The
normal environment remains email-disabled. No live mail was sent. Only runner-owned
disposable databases were used, and cleanup was verified. The partial development
database was not used. No merge, push, deployment or environment publication occurred.

## Verification

| Check | Result |
| --- | --- |
| `npm run test:recovery-request-ui` | PASS, 11 grouped browser checks; final run `2980f75c1939937e9c152052` |
| `npm run test:login-navigation` | PASS, 7 tests including real USER/ADMIN login, failure recovery, repeated sessions, logout and delayed navigation |
| `npm run test:email` | PASS, existing encryption/outbox/retry/notification integration and browser checks with fake credentials and simulated provider; run `20afd94ccbd69cc947e6a057` |
| `npm run typecheck` | PASS, Next route generation and full TypeScript |
| `npm run lint` | PASS |
| `npm run build:verify` | PASS, migrations and optimized build against an owned disposable database; final run `f510895a065fb3074efcbf06` |
| Axe automated scan | Zero reported violations across 8 initial-page combinations: login/recovery × light/dark × 1440px/390px |
| Cleanup | Each completed runner removed its owned database; manual inspection harness also confirmed removal |

Focused checks cover real invalid credentials and the real disabled-delivery API,
keyboard route activation, required-email validation, focus on errors/confirmation,
connection failure, safe mapping of malformed/rate-limited/server responses,
duplicate submission, simulated neutral HTTP 202, cooldown/change-email behavior,
ambiguous timeout, skip-link/main focus, mobile sizing, no horizontal overflow at
390px and 320px, reduced motion, registration presentation, no credential web
storage and zero browser exceptions. Simulated acceptance is deliberately distinct
from the real disabled-delivery check. `/reset-password` remains 404: Step 2 has not
begun. The previously completed backend/live-delivery evidence is not counted as a
new live end-to-end reset test.

The repository contains both Playwright package families. The new suite imports
`expect` from `playwright/test` to match the existing browser helper's `playwright`
types; no casts, disabled type checks or dependency changes were needed.

## Accessibility and visual evidence

Inputs use visible labels and 16px text; primary controls are at least 48px tall.
Visible focus, semantic headings/landmarks, error alerts, busy state, a skip link and
explicit navigation replace the old modal's missing Escape/focus behavior. No
authentication animation or sound is used; reduced-motion disables press effects.
Countdown text is not repeatedly announced to assistive technology.

Automated contrast checks are **incomplete** because the texture pseudo-elements
prevent Axe from determining backgrounds. This is not a full accessibility
certification. Base text/background token pairs were calculated separately: the
lowest checked small-text pair is 5.19:1, with placeholders now using full-opacity
muted ink (6.00:1 against the light sheet). Actual screenshots were inspected in
both themes. Hardware screen-reader and real-device testing remain review limits.
See [validation evidence](validation.json) for the individual checks and scan limits.

All images below are actual local application captures using synthetic data. Only
the Next development toolbar is hidden for captures; application feedback is not
hidden. The confirmation capture uses simulated HTTP 202, not real email delivery.

| View | Screenshot |
| --- | --- |
| Login, desktop | [Light](screenshots/login-desktop.png) |
| Recovery request, desktop | [Light](screenshots/recovery-desktop.png) |
| Temporarily unavailable | [Desktop](screenshots/recovery-unavailable-desktop.png) |
| Neutral request received | [Desktop — simulated acceptance](screenshots/recovery-received-desktop.png) |
| Login, mobile | [Light](screenshots/login-mobile-light.png) · [Dark](screenshots/login-mobile-dark.png) |
| Recovery request, mobile | [Light](screenshots/recovery-mobile-light.png) · [Dark](screenshots/recovery-mobile-dark.png) |

## Remaining work

Owner visual acceptance is pending. Step 2 (token-fragment handling, new-password
form, invalid-link states and reset success) and Step 3 cross-flow acceptance are
not implemented or authorized to start automatically. Public recovery activation
still requires that complete experience and separately reviewed sender/origin,
worker and deployment arrangements. General recipient delivery cannot use Resend's
account-only default sender. Keep delivery disabled outside separately approved
testing. Stop after Step 1 for feedback.
