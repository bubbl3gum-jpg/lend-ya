# Meetup historical-upgrade fixture repair

2 November 2026, Asia/Taipei. Integration baseline `168045843bc2abefb035bf713bd237bd5e4d0ad9`. Focused test repair only; no historical migration, application authority, QR/evidence validation or database schema edits.

## Reproduction and first error

`npm run test:meetup-migration` reproduced the owner's reported CI failure in a new guarded, marked, disposable database:1 test failed; Prisma applied31 selected migrations until `20261029110000_owned_condition_claims`, then surfaced SQLSTATE25P02 (`current transaction is aborted`). The original Actions run is https://github.com/bubbl3gum-jpg/lend-ya/actions/runs/41384663858. Its public page reports Failure; the authenticated API is inaccessible from this workspace (Forbidden).

Direct PostgreSQL replay of the same untouched SQL with the same two omissions, in another newly owned guarded DB, stops at the **first** error: SQLSTATE **42704**, `type "MeetupEvent" does not exist`. The condition-claim trigger function declares `receipt "MeetupEvent"` at migration line94; that table/composite row type is created by the omitted meetup migration. The subsequent transaction-aborted diagnostic obscured the prerequisite error. The diagnostic transaction was rolled back and its marked DB removed.

This establishes an invalid test migration sequence, not a demonstrated defect in ordinary chronological full migration deploy. No `db push`, migration resolution, edits to historical SQL, auth bypass or suppression is used.

## Focused correction

`tests/meetup-migration.test.ts` now models four genuine historical stages:

1. Apply the17-migration chronological prefix **before** `20261019210000_mrt_meetup_verification`; keep later migrations out rather than punch two holes into today's history. Assert exact applied prefix.
2. Preserve the existing populated fixture (accounts, historical bookings/stations, handoff/return/condition records, dispute, protected photo bytes, chat/moderation/analysis and immutable audit). Apply only meetup. Preserve every original table's rows/checksums and verify no retroactive meetup enrollment/events.
3. Add the original historical consumed-QR fixture, then apply only `20261020090000_meetup_confirmation_window`. Preserve every original row except its explicitly new nullable field; require confirmationExpiresAt null and immutable on attempted update.
4. Apply all remaining original migrations in order. Preserve existing rows/QR/evidence and prefix checksums; explicitly require the three later Booking documentation fields to remain null rather than invent agreement authority. Verify all33 migration names, actual SQL SHA-256 checksums, successful completion/no rollback, continued consumed-QR immutability and repeat-deploy no pending migrations.

The added projection excludes only those three schema additions and separately asserts each is null for both original historical bookings. It does not ignore arbitrary new fields or loosen historical-value equality. All preexisting fixture records and security/preservation expectations remain.

## Verification and publication checkpoint

Fresh outcomes, initial failures, independent33-migration replay, cleanup and source preservation are in `verification.json`. Raw logs remain private ignored artifacts. No current real application DB was reset/migrated/seeded.

The report records local verification at publication time. The new run's actual status must be checked against the published commit and reported separately; local green tests do not establish a green GitHub Actions run. No merge into main or deployment is authorized by this repair.

Local results before publication: meetup migration1/1 after1/1 reproduced failure; `test:migration` exit0; full `test:meetup`12/12 (actual virtual-camera pickup/return); Admin, condition-claim, rental-documentation and recovery-room upgrade fixtures1/1 each; unit201/201; TypeScript/lint pass. Independent fresh full33-migration replay/checksums/repeat pass; final task DB count0.
