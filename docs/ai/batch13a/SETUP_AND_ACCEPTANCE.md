# Setup, reproducible acceptance and limitations

Only the existing owned Support test harness may provision these synthetic cases and restricted principals. Do not point the candidate at an application database or manually issue production grants. The code checks NODE_ENV, exact candidate flags, matching target URLs, owned run marker, restricted DB privileges, real current session and (for staff) existing scoped worker admission/assurance/assignment/grants/audit. This is not a general localhost flag bypass.

## Commands

```sh
npm run test:unit
npx tsc --noEmit
npm run lint
npx prisma validate
# Set MRT_TEST_DATABASE_URL to a NEW, uniquely named hustlen_test_* target,
# using the existing effective-target/ownership guard. Never an existing database.
npm run test:support-staff
npm run test:support-staff-production
npm run build:verify
```

`test:support-staff` provisions the existing restricted runtime/private Unix worker and synthetic identities in its newly owned database. New companion flag `HUSTLEN_SUPPORT_ASSISTANT_CANDIDATE=offline-only` is added to this fixture environment only. Existing `HUSTLEN_SUPPORT_STAFF_CANDIDATE=owned-synthetic-only`, explicit localhost origin, identical guarded URLs and exact run ID remain mandatory. Credentials/socket secrets are handled by the existing fixture, not documented or copied to a browser. A standalone operator must follow the Stage 7 fixture/runbook, not invent real staff membership.

Both existing `/dev/support-requester` and `/dev/support-agent` link to `/dev/support-companion` only when configured. The two tabs share deterministic UI/composition contracts; the copilot tab still needs native passkey verification in the existing workbench and exact assigned ticket/channel IDs. No assistant endpoint can enroll/verify, issue a grant, admit staff or create/send a case/message. IDs come from authorized existing flows; merely entering them grants nothing.

## Actual acceptance flow exercised

- Borrower signs in through the real browser login, uses the current owned requester intake and has a separate private channel from Owner.
- Borrower describes a disputed return in the guide, gets missing-information questions and an editable unsent draft. Ticket count is unchanged. Copy is disabled until review; locale switching retains edits.
- Synthetic Support agent signs in, uses native browser WebAuthn, receives fixture-only assignment/channel grants, and opens the selected borrower channel in the copilot.
- Copilot reads real persisted scoped metadata/messages/events through the existing audited DAL, shows return-related source overview, dated references and a possible inconsistent-claim hint, and produces an English then Chinese review-only draft. Original English sources are explicitly untranslated. Opposing Owner content is absent.
- Injected source instructions/HTML stay text and cannot become an image, tool or access grant. Unassigned staff, participants, legacy Admin/Reviewer, forged fields/IDs and wrong Origin/CSRF are denied. Forced audit failure produces denial with no disclosed source. Assignment revocation denies the next request and clears the displayed result.
- Existing workbench reply, stream, immutable audit, MFA, service-principal, logout and revocation assertions remain active. The assistant itself never sends the test replies; setup uses the existing explicit authenticated API.

A user who wants a ticket must manually take their reviewed draft into the existing intake and explicitly submit there. Copying a draft is not sending or ticket creation. This batch does not add prefilled navigation or persistence across navigation. A human operator is not claimed to have read/approved a case merely because a draft was prepared.

## Font verification environment

The **normal production build initially failed** because the inherited root layout uses next/font Google Geist and this environment's network proxy returned 403 for fonts.googleapis.com. No application font imports or security assertions were changed. An attempted fixture using local binary font paths exposed a Turbopack fetch/rewrite panic; that attempt also failed and remains separate evidence.

Production refusal/build verification is additionally run with:

```sh
NEXT_FONT_GOOGLE_MOCKED_RESPONSES=/workspace/lend-ya/tests/support/offline-font-responses.cjs npm run test:support-staff-production
NEXT_FONT_GOOGLE_MOCKED_RESPONSES=/workspace/lend-ya/tests/support/offline-font-responses.cjs npm run build:verify
```

This is the framework's explicit **test-only CSS response hook**, returning an explanatory CSS comment and system fallbacks. It does not pretend that remote fonts downloaded, prove remote font fidelity, modify application code, authorization or output, or make the normal build green. Pages/API are actual compiled application routes; only the external font resource is substituted. Screenshots are actual application with this disclosed font fallback; heritage headings use the existing local serif stack. Production infrastructure font availability/self-hosting needs its own follow-up, not an unrelated root-layout change in this batch. Do not set this hook as a production release workaround.

## Accessibility and performance scope

Actual Chromium desktop 1440, tablet 820 and mobile 390 CSS pixels; keyboard focus, labelled controls, responsive no-overflow and bilingual draft/navigation checks. Shared preferences/theme/materials are inherited, no new imagery/audio/particle assets. No fabricated typing animation or model latency. Human-readable original timestamps use Asia/Taipei, retaining UTC in DTO.

Bounded report (1200 characters), closed inputs, first channel message page (10 displayed + truncation hint), at most 100 events, finite enums, process-local 30 requests/min/actor and map 1000, existing worker timeouts, client abort/deadline and response sequence fence. This is not durable production abuse/cost control or a load/performance certification. Browser/worker cancellation may not cancel a committed read audit. Real devices, Safari, screen-reader evaluation, comprehensive contrast and owner visual acceptance remain pending.

## Why stop after 13A

This is the programme's first separately reviewable Customer Service checkpoint. Substantial native authentication, scoped data and regression evidence must be reviewed before extending contexts. No security dependency is bypassed to implement lower-priority features. 13B Owner drafting/context and 13C eligible listing discovery/comparison are not implemented; the enum does not activate them. 13D unified cross-module navigation/acceptance and any future live adapter remain separate work. Stage 7 production policy and all ten live-model approvals remain unresolved.
