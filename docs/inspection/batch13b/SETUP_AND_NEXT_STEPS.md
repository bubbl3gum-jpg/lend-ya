# Setup, safe reproduction and next decisions

Branch: `feature/trust-evidence-inspection-batch-13b`. Use only the existing guarded newly-owned disposable PostgreSQL harness; never point at/reset/migrate an application DB. No schema or migration added. `test:meetup` starts its own development server, configures inspection candidate/origin, performs actual pickup/return checks and QR/physical-receipt operations, and captures owner/borrower inspection pages. This new inspection scenario uses manual QR code API verification and attached synthetic photo files; the **full** suite separately retains genuine virtual-camera pickup and return decoding. Do not conflate them.

Commands, with MRT_TEST_DATABASE_URL set to a fresh unique guarded target for each changing run:

```sh
npm run test:unit
npx tsc --noEmit
npm run lint
npx prisma validate
npm run test:meetup
npm run test:support-staff-production
npm run build:verify
```

Normal build no longer requires `NEXT_FONT_GOOGLE_MOCKED_RESPONSES`; all current coordinator runs explicitly remove it. Fonts use existing local/system stacks; no third-party font asset distributed. The font correction has its own commit and build evidence.

When correctly configured, participant booking pages link to `/dev/inspection`. Enter an owned booking ID; route independently checks database ownership and participant authorization. No direct fixture timestamp/event/request overrides accepted. Shell materials/appearance inherited; no sound/particles. Existing protected booking/evidence links remain separately authorized. For an open owner-authored legacy test dispute with acknowledged return, borrower can prepare an unsent factual/disagreement/accessory statement and request-human-assistance draft flag. Nothing is sent or submitted by this page.

## Explicitly blocked, not placeholders claimed complete

- Actual structured claim submission and borrower-response persistence/audit.
- Qualifying notification delivery and any enforceable response deadline.
- Supplemental late evidence uploads and immutable claim evidence snapshots.
- Global production enforcement/cutover of the new 24h/48h policy, exceptions and appeals.
- Immutable rental-specific accessory inventory, media capture-time attestation and assisted comparisons.
- eKYC provider/gates using real verified outcomes, biometric challenges or storage.
- Live Vision, full Resolution Room, binding recovery/amendments, financial handling, Owner/Borrower AI.

Next review should approve the bounded additive claim/response/event model and notification qualification/exception contract, reconcile legacy writer transition/custody semantics, and define idempotency/concurrency/atomic audit before enabling submissions. Preserve original evidence and real return while inspection/dispute/settlement proceed independently. Any migration needs a separate narrow justification and fresh/populated replay tests. No new staff/Support permissions or general status editor.

Canonical product blueprint records the agreed 24h/48h durations but not final production activation. Original fourteen master stages/order/objectives remain; Stage 10 In Progress. Stage 6 station controls, Stage 7 real Support/recovery policies/gates, Stage 8 publication/settings approvals and Stage 9 visual/security acceptance remain outstanding. Prior human-review scores remain unchanged/unsaved, and all ten inference approvals remain unresolved.
