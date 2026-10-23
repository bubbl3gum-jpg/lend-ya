# Batch 2A — security readiness review

23 October 2026 UTC. Branch: `security/admin-readiness-batch-2a`, directly based on Batch 1 `98d24a918be7ce391c201cfd1822eb6ed84bbc36`. Final implementation commit is the commit containing this report (`git log -1`); its exact SHA is provided in the closeout response.

## Batch 1 closeout

[Closeout and metric verification](BATCH_1_CLOSEOUT.md) confirms the original branch HEAD, clean starting tree, committed planning documents and complete report. The [offline screenshot gallery](batch1/index.html), original desktop/tablet/mobile PNGs and [checksums](batch1/SCREENSHOT_MANIFEST.txt) allow inspection without an application or database. All four PNGs match Batch 1 byte for byte. No Admin presentation, query, form, permission or route was changed in Batch 2A.

## Confirmed findings and changes

| Finding | Root cause, conditions and treatment |
| --- | --- |
| **Connection isolation gap — high operational risk, confirmed** | The old guard validated `URL.hostname` and pathname, but `pg-connection-string` gives query `host` precedence. Constructing an unconnected `pg.Client` proves `?host=remote.invalid` selects a remote host despite the visible localhost authority. In this installed driver it can also change the interpreted pathname; this is not a claim that every `?database=` option overrides the database. Ambient PostgreSQL options and native-driver selection could also escape the guard's assumptions. Exploitation requires control of local tooling configuration/environment; no remote Admin attack or actual existing-database damage was demonstrated. |
| **Raw exception logging — confirmed exposure path; no historical leak established** | `internalServerError`, seed/provision/preflight/acceptance/runner catches printed raw errors/messages, which can contain credentials, private query arguments, tokens and user information. Shared structured logging now emits a bounded event, fresh UUID correlation ID, static operation context, allowlisted error class and allowlisted driver/Prisma code. No message, stack, cause, metadata or arbitrary properties are emitted. Unexpected API 500s expose only the correlation ID in `X-Error-Id`; expected 4xx responses are unchanged. |
| **Incomplete camera failure capture — confirmed diagnostic gap** | The camera uses a separate browser instance, but the old finalizer captured only the primary browser's pages. Diagnostics now include both instances and bounded video readiness/dimension state, so a borrower scan failure can be inspected. This does not change scanning, location validation, consent, receipt checks or success assertions. |

The shared `lib/disposable-database-url.ts` policy rejects every query option except a single `schema=public`, fragments, raw whitespace/control characters, non-local hosts, invalid ports and non-`hustlen_test_*` names. It rejects nonempty `PG*` environment variables except credential-only `PGUSER`/`PGPASSWORD`, plus `NODE_PG_FORCE_NATIVE`; unspecified ports become explicit 5432. This deliberately refuses even benign unsupported options instead of guessing how different drivers interpret them.

`tests/support/test-database.ts` inspects `pg`'s effective host/port/database and startup options before connecting, including its underlying connection parameters, and rejects target disagreement or startup/replication overrides. The connection wrapper then checks `current_database()` before returning. Maintenance connections are derived from a validated test URL and must actually be connected to `postgres` before CREATE/DROP tooling proceeds. Ownership checks also revalidate the effective target.

The runner and demo launchers retain create-new-only semantics, verify the random ownership marker before migration/seed/test subprocesses, and recheck target/ownership before cleanup. They never adopt an existing database. Temporary GPS mode shares the stricter URL/environment policy, and isolated Prisma application startup rejects unsafe test bindings before connection; existing participant/ownership gates remain in place. Normal application database configuration is not rewritten by the test policy.

Prisma's default query-error sink is replaced by error-event logging in the shared client and the local provisioning client, so its own rendering cannot bypass the redaction at the catch site. Chat and meetup unexpected failures now retain approved error codes through the same logger. Existing fixed safe CLI messages remain where useful; chat acceptance retains a static `server.lock` troubleshooting hint. Expected business errors and immutable audit/evidence records remain unchanged.

## Dependency assessment and compatible patches

Evidence: [audit before](../security/batch2a/audit-before.json), [audit after](../security/batch2a/audit-after.json), [resolved dependency tree](../security/batch2a/dependency-tree.json). These are the npm registry's advisory results against this lockfile, not proof of application exploitation. Direct GitHub advisory-detail requests were unavailable in this environment; detailed exploit payloads/CVE mapping were not independently verified. The registry supplied GHSA identifiers, affected ranges, severity and fixed-version recommendations; its CVSS score fields were zero/unspecified, so no numeric CVSS is claimed.

| Advisory | Registry severity / affected installed package | Attack conditions and application assessment | Applied fix / evidence |
| --- | --- | --- | --- |
| [GHSA-2464-fhr4-w9xw](https://github.com/advisories/GHSA-2464-fhr4-w9xw) | Critical; Next.js 16.3.8, affected `>=16.0.0 <=16.4.0` | Registry reports unauthenticated RCE in image optimization when SVGs are used. Current `next.config.ts` has `images.unoptimized=true`; the ordinary optimizer path is not used by this app. Exact exploitability was not reproduced, and this configuration is not offered as a permanent substitute for patching. | Next.js 16.4.3, matching Next ESLint package; audit no longer matches. |
| [GHSA-p3m5-59mp-jv5r](https://github.com/advisories/GHSA-p3m5-59mp-jv5r) | High; Next.js 16.3.8, same affected range | Registry reports App Router Server Action DoS. App Router is used. No application `use server` functions were found, but that absence alone does not prove the framework request parser unreachable. Treat framework exposure conservatively. | Next.js 16.4.3; fresh production build and real auth/Admin/chat/booking/meetup checks validate compatibility. No hostile DoS replay was performed. |
| [GHSA-673q-mjm6-r5xr](https://github.com/advisories/GHSA-673q-mjm6-r5xr) | Critical; Next.js 16.3.8, same affected range | Registry reports unauthenticated RCE in `use cache` functions returning typed arrays. No `use cache` functions or cache-components enablement were found in application source/config. Specific application exploitability is unconfirmed. | Next.js 16.4.3; affected version removed and audit cleared; no independent RCE exploit validation claimed. |
| [GHSA-ggr8-5vv4-36mx](https://github.com/advisories/GHSA-ggr8-5vv4-36mx) | High; `deepmerge-ts <8.0.0`, transitively marking Prisma / `@prisma/config` 7.10.0 affected | Recursive object graphs can cause unbounded merge recursion/stack exhaustion. Prisma configuration is local source-controlled CLI input here, not an exposed user-content merge API. No remote application exploit was established. | Prisma, client and pg adapter aligned to 7.10.1; upstream `@prisma/config` now resolves `deepmerge-ts` 8.0.2. A 3-second, 64-MiB child-process regression merges two cyclic graphs and verifies the resulting cycle without stack exhaustion. |

The original audit had four affected package entries (one critical, three high; Next.js aggregates three advisories). The new audit has zero. This is **registry finding clearance**, supported by resolved-tree inspection, the recursive-merge regression, regeneration and functional checks; it is not a claim that version strings alone prove all security properties. No major framework migration or manual major transitive override was introduced. Node 24 satisfies Next's `>=20.9.0` requirement. Versions are pinned for review; the prior scoped mysql2 override is unchanged. Lockfile changes are confined to the Next/Prisma dependency families.

## Verification and reproducibility

All database-changing commands use the ownership runner and new local `hustlen_test_b2a_*` names, never a real application database. They use the local PostgreSQL instance only as a database factory; each target must be newly created. Credentials/connection URLs are not committed. The runner was supplied an explicit fresh `MRT_TEST_DATABASE_URL`, Chromium path and `MRT_TEST_KEEP_ON_FAILURE=0`. All completed runs reported owned-database/upload cleanup. Raw logs and synthetic browser diagnostics remain ignored/local under `/tmp/hustlen-security-b2a/` and `.test-artifacts/<runId>/`; they may include synthetic private case/QR fixtures, so they are not public report attachments.

| Command | Result |
| --- | --- |
| `npx tsc --noEmit` | PASS, exit 0 |
| `npm run lint` | PASS, exit 0 |
| `npm run test:unit` | PASS, 45/45 |
| `npm run test:admin` | PASS, 7/7 |
| `npm run test:moderation` | PASS, 10/10 |
| `npm run test:chat` | First: 12 pass / 2 fail including parent; unchanged rerun: PASS 14/14 |
| `npm run test:stability` | PASS, 8/8 |
| `npm run test:rental-api` | PASS, 13/13 |
| `npm run build:verify` | PASS, production build on a fresh owned database; final-source recheck recorded in manifest |
| `npm run test:meetup` — serial run 1 | PASS, 9/9; includes synthetic-camera browser scan |
| `npm run test:meetup` — serial run 2 | PASS, 9/9; includes synthetic-camera browser scan |
| `npm audit --json` | Before: 4 affected package entries; after: 0 |
| `npx prisma generate --config prisma7.config.ts` | PASS; generated client only, no database operation |
| `git diff --check` | PASS |

New regressions cover malicious query hosts/ports/database names, encoded/duplicate/unknown options, socket/certificate/startup options, ambient driver overrides, default-port pinning, effective driver-parameter tampering, temporary GPS mode refusal, hostile logger getters/proxies, secret exclusion and correlation IDs. A local TCP trap verifies CLI rejection with **zero connections**, before any database/schema operation. Existing ownership-marker/actual-identity tests still pass.

The initial chat failure was `tests/chat.integration.test.ts:206`: the second browser login remained at `/login` beyond the existing 5-second assertion. Server logs show the login endpoint returned 200; the unchanged rerun passed. This is confirmed test intermittence, not a confirmed auth vulnerability, and its cause is not established. No login assertion, timeout or application UI was changed. An initial unit run also failed an acceptance-CLI diagnostic expectation after redaction; a fixed safe troubleshooting hint was retained rather than re-exposing raw filesystem errors.

Meetup reproduction was bounded in advance to **two complete serial runs**, each with a new owned database, unchanged camera/GPS/QR/consent/evidence success requirements, Chromium, and independent per-run fake-camera files. The first run's early API phase overlapped the chat rerun; its camera phase had no concurrent suite. The second run overlapped isolated build rechecks, including its later browser phase. Both camera scenarios passed; there was no camera failure to diagnose in this sample. This is a bounded check, not statistical proof that historical flakiness is gone. Prior baseline camera failures and Batch 1's passing run remain historical evidence, not attributed to this security batch.

[Verification manifest](../security/batch2a/verification.json) records exact per-run times, IDs, counts, exits, cleanup and initial failure evidence. Diagnostic capture now includes camera-browser screens/HTML and video readiness metadata if a future scan fails; no QR payload, coordinates or private case content is added to application logs or Git.

## Exact changed-file inventory

- `AGENTS.md`
- `app/api/bookings/[id]/meetup/[operation]/route.ts`
- `docs/admin/BATCH_1_CLOSEOUT.md`
- `docs/admin/SECURITY_READINESS_BATCH_2A.md`
- `docs/admin/batch1/SCREENSHOT_MANIFEST.txt`
- `docs/admin/batch1/index.html`
- `docs/security/batch2a/audit-after.json`
- `docs/security/batch2a/audit-before.json`
- `docs/security/batch2a/dependency-tree.json`
- `docs/security/batch2a/verification.json`
- `lib/api-response.ts`
- `lib/chat/http.ts`
- `lib/disposable-database-url.ts`
- `lib/meetup/test-location.ts`
- `lib/operational-error.ts`
- `lib/prisma.ts`
- `package-lock.json`
- `package.json`
- `prisma/seed.ts`
- `scripts/chat-demo-acceptance.ts`
- `scripts/chat-demo.ts`
- `scripts/create-admin.ts`
- `scripts/db-preflight.ts`
- `scripts/local-meetup-demo.ts`
- `tests/dependency-security.test.ts`
- `tests/meetup-test-location.test.ts`
- `tests/meetup.integration.test.ts`
- `tests/operational-error.test.ts`
- `tests/run-isolated.ts`
- `tests/support/test-database.ts`
- `tests/test-safety.test.ts`

`AGENTS.md` contains only the heading-level adjustment regenerated by the patched Next.js version; its instructions are unchanged. `prisma/seed.ts` and `scripts/create-admin.ts` changes concern safe diagnostics only, not seed/provisioning authority. No migration files changed.

## Unresolved risks and review boundary

- Historical camera intermittence and the new transient chat redirect assertion have no established root cause; passing bounded reruns do not prove either is fixed.
- No RCE/DoS payload was replayed. Advisory applicability beyond the source/config observations remains an independent review item; registry audit results do not cover undisclosed vulnerabilities.
- Disposable isolation assumes a trusted local OS, Node runtime and PostgreSQL administrator. A hostile superuser able to replace databases/forge markers or modify the process is outside this guard's security boundary. New guard failures require correcting configuration, never bypassing checks or adopting/resetting a database.
- Structured logs intentionally omit raw stacks/private values. Use correlation IDs, fixed operation labels and approved codes for diagnosis; investigate further only in a controlled environment with synthetic fixtures. Third-party framework/CLI output and unrelated success output are not claimed to have undergone a universal logging audit.
- Raw ignored test artifacts retain synthetic screenshots/HTML until review; remove only the listed run directories and `/tmp/hustlen-security-b2a/` when finished. Database cleanup is automatic. Do not remove existing application storage or unrelated runs.
- No four-role migration, approval engine, staff grant change, privileged Admin control, payment, AI, migration history, official MRT catalogue or existing database record was changed. No merge, release-branch push or deployment was performed. Stop after the isolated commit for independent review.
