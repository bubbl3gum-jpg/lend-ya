# Reproduce the offline foundation

`npm run test:ai-case-brief` exercises the real page/API/browser against a new owned disposable database. Existing harness verifies effective PostgreSQL target, difference from the application URL, ownership marker/run ID and cleanup; use only a fresh unique `MRT_TEST_DATABASE_URL`. No reset/migration/seed of any existing application database. Browser executable here is `/usr/bin/chromium` via `MRT_BROWSER_PATH`. Test secrets/URLs stay in local environment configuration, never Git/logs/evidence.

The harness enables only the existing `HUSTLEN_AI_CASE_BRIEF_DEMO=synthetic-only` development gate and trusted localhost `HUSTLEN_AI_BRIEF_ORIGIN`. Existing ACTIVE legacy Admin/session requirements remain. Public requests provide only exact fixture selector, en/zh-TW and a fixed labeled offline fault condition; no provider, role, account selector, arbitrary manifest or text. No credentials or SDK are necessary. Existing provider environment settings are not read by this composition and never authorize live processing.

- `npm run test:ai-evaluation`: deterministic contract suite and 16-scenario evaluator, no database or real provider. Optional `MRT_AI_EVALUATION_PATH` writes bounded case-ID/outcome metadata; no bodies/secrets.
- `npm run test:ai-case-brief-production`: actual isolated production build/start with flag configured; page/API stay 404 and link absent.
- `npm run test:ai-case-brief-disabled`: actual development server without flag, same refusal.
- `npm run test:unit`: all existing plus offline pipeline checks; explicit inventory continues to hash-pin every historical Admin route.
- TypeScript, lint, Prisma validation and production build commands are recorded in the final ledger. Wrapper exit is not used to infer child success.

The static prototype itself needs no migration or case writes. Authenticated browser/negative tests create and expire synthetic sessions/Admin fixtures only in new owned test DBs; actual rate-limit test uses a separate synthetic actor. Existing migrations replay on those targets only. Selected booking/Support/staff/audit tables are hashed before/after to verify no case mutation. Source-preservation evidence verifies all historical SQL/lock/schema, dependency lockfile and auth/Support/staff/chat/custody/meetup code unchanged.

No egress evidence is scoped honestly: pure offline tests use a throwing fetch sentinel, audited modules have no network/provider/private DB imports, the browser records no external HTTP requests and only the exact same-origin synthetic API calls. The shipped route hardcodes OfflineBriefAdapter; no runtime plugin/endpoint/key selection exists. This is not a universal network sandbox or proof about a future malicious adapter. Existing cloud-adapter unit tests use fake transports, not live models.

All selected changing suites use separate fresh owned databases. Final read-only maintenance verifies zero remaining owned 12B DBs/principals; owned fixtures/uploads are removed by the existing harness. Completed ownership-recorded generated Next caches may be pruned for capacity, retaining screenshots/diagnostics. No merge, push, deploy, staff provisioning, production Support, AI execution, actual model spend or existing database change.
