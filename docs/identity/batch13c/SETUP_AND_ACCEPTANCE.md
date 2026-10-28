# Owned-development setup and acceptance

Never point this candidate or tests at an existing application database. The isolated runner creates a new unique local `hustlen_test_*` PostgreSQL DB, attaches its own 24hex ownership marker, deploys **existing** migrations only, verifies ownership before changing commands and removes the owned DB and its recorded uploads afterwards. Creation fails if a requested target already exists. No migration/schema/dependency is added by 13C.

With a fresh target supplied via MRT_TEST_DATABASE_URL using the established harness:

```sh
npm run test:unit
npm run test:identity
npm run test:identity-production
npm run build:verify
```

The identity integration selector configures HUSTLEN_IDENTITY_CANDIDATE=`owned-synthetic-only`, HUSTLEN_IDENTITY_ORIGIN to its exact localhost server, and all three DB URLs plus run marker. It also supplies deliberately unusable provider-looking variables to prove they do not activate a path. There is no real provider key or endpoint in this setup. These flags alone cannot pass the gate without actual owned DB identity and a current ACTIVE account/session. Tests register fresh ordinary synthetic accounts through actual auth routes; there is no eKYC seeding of existing accounts.

When running an owned development fixture, Account → Trustworthiness & profile verification contains a clearly labelled bilingual simulation link. `/account/identity` supports scripted scenarios and next-step transitions, revocation/reset, server refresh and synthetic history. A real new login starts a separate session demonstration. To demonstrate an event challenge, use an actual owned test booking in HANDOFF_PENDING or RETURN_PENDING; its stage and purpose are server-derived. Never mark a real booking merely to display the demonstration.

No upload fields exist. Do not supply real documents, faces, identity numbers, private support material or actual provider credentials. Closing the dev process discards all simulator state; otherwise absolute 30m TTL removes session entries. Logging out denies future access and a subsequent login cannot retrieve the old session's state; old in-memory entries remain inaccessible until TTL/process exit. No database eKYC data to clean up. The runner removes all its separately owned DB fixtures; do not delete existing database records.

## Acceptance boundary

Working candidate means real account navigation, real authenticated HTTP, server-controlled scripted stages, honest synthetic status, isolation/replay/expiry checks and production refusal. It does **not** mean real eKYC, provider anti-spoofing, government verification, biometric accuracy, immutable authoritative verification events, production identity staff, enforced participation gates, production readiness or visual acceptance.

Next authorized review should settle provider/legal/cost/retention/accessible alternatives and durable outcome/callback schema plus transactional cutover design before any real processing. No next engineering batch, live Vision, Owner/Borrower AI or real randomized biometric verification is authorized by this closeout.
