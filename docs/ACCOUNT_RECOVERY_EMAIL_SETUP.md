# Hustlen' recovery email setup

## What is ready

Recovery requests can be queued for Resend, using the Milestone 1 password/token safeguards. Recovery and password-change messages have HTML and plain-text versions. Persistent jobs are encrypted with AES-256-GCM and processed by a separate local worker. There is no requirement for a new queue service.

Real delivery is **disabled by default**. No Resend account, sender domain or API key has been created by this implementation. Automated tests use fake keys and simulated responses and send no real email.

The `/reset-password` page is still milestone 3. Email delivery can be tested now, but clicking its recovery button will not complete recovery until that page exists. Do not enable public recovery before that page and the production sender are ready. Registration ownership verification is a separately agreed future milestone; syntactically valid email alone does not prove an inbox exists or belongs to its user.

## Local setup

1. Create a [Resend account](https://resend.com/signup). Without a domain, use its default test sender `onboarding@resend.dev`. Resend restricts that sender to the email address associated with your Resend account; it cannot deliver recovery for arbitrary marketplace users. See [Resend's test-sender restrictions](https://resend.com/docs/knowledge-base/403-error-resend-dev-domain).
2. Create a sending API key. Put it in your local `.env` or managed environment settings as `RESEND_API_KEY`; never put it in source control or chat. This worker loads `.env`, so keep the app and worker settings there or supply the same environment variables to both processes. Do not put these secrets in variables beginning with `NEXT_PUBLIC_`.
3. Generate a unique encryption key in your own terminal:

   ```sh
   node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
   ```

   Store it securely as `RECOVERY_EMAIL_ENCRYPTION_KEY`. The app and every worker must share it. Keep it stable across restarts; changing it while jobs are pending makes their encrypted content unreadable. Drain/cancel pending jobs before rotation. Protect database backups and their encryption-key access too.
4. Copy the email variables from `.env.example` into your existing `.env`, preserving `DATABASE_URL`. Set `RECOVERY_EMAIL_MODE=resend-test`, `RECOVERY_EMAIL_TEST_RECIPIENT` to your actual Resend account email, and `RECOVERY_APP_ORIGIN=http://localhost:3000` (adjust the port if needed). `RECOVERY_EMAIL_FROM` contains only the address; the app adds the `Hustlen'` sender name.
5. Follow the existing migration/baseline guidance in README.md. Deploy forward migrations with `npx prisma migrate deploy --config prisma7.config.ts` and generate the client with `npx prisma generate --config prisma7.config.ts`. Do not reset or reseed an existing database. This implementation has only migrated isolated test databases.
6. Start the two local processes in separate terminals:

   ```sh
   npm run dev -- --hostname 127.0.0.1
   ```

   ```sh
   npm run email:worker
   ```

   If running inside the managed cloud environment, outbound policy must allow `api.resend.com`. Its current allowlist does not include that host. Where Node must use the inherited HTTP proxy, run the worker with `NODE_USE_ENV_PROXY=1`, keeping the managed CA trust settings. Add network access through environment settings; do not bypass network policy or TLS verification.
7. Register/use an account whose email matches the approved test recipient. Request recovery from the login dialog. Open the email on the same computer where the app is listening: `localhost` on your phone points to your phone, not this computer. In a cloud workspace it points to that workspace; use its preview forwarding or a later HTTPS staging origin when testing from another device.

The local request handler uses one shared loopback IP bucket and ignores spoofable forwarding headers. This is conservative: the aggregate local limit is 20 accepted requests/hour. Public deployments require a trusted single-IP proxy header instead.

## Delivery and failure behavior

- The API checks global configuration, worker heartbeat and any provider-wide pause before looking up the account. With delivery available, valid known, unknown and throttled addresses get the same neutral HTTP 202 response. A short minimum response time with random variation masks routine database timing differences; provider calls happen only in the worker. This confirms request handling, not that a message was sent or delivered.
- If the worker has not checked in for 30 seconds, or a provider-wide outage/authentication/rate-limit pause is active, all valid addresses get the same temporary-unavailability response. An outage can start after a request is queued; that job remains eligible for retries.
- Recipient-specific rejection is private. It does not produce an account-specific API response or pause unrelated users. Passwords and sessions are untouched by requesting or failing to deliver recovery email.
- Test mode suppresses other recipients; it never forwards their recovery links to the developer's mailbox.
- Jobs have persistent leases so another worker can recover after a crash. Every retry uses the identical frozen email payload and [Resend idempotency key](https://resend.com/docs/dashboard/emails/idempotency-keys). No database lock is held during network calls. A provider timeout is ambiguous: the message may already have been accepted, so retry with the same key rather than creating a new message.
- Temporary failures use increasing delays (30 seconds, 2, 5, 15, 30, 60 and 180 minutes), respect provider retry guidance, and stop after at most 8 attempts. Recovery retries stop at the original 30-minute deadline; notifications stop after 23 hours, within Resend's documented 24-hour idempotency window. Permanent rejection stops retries immediately. These are limits on application submission attempts, not guarantees about provider delivery latency.
- New recovery issuance cancels older pending recovery jobs. Successful reset cancels pending recovery jobs and records the password-change notification in the same transaction as password update/session revocation. If that database transaction cannot persist the notification, it does not report a successful reset. After commit, email delivery failures never reverse the change.
- A provider request already in flight cannot be recalled when a newer link is requested. An older email may arrive later, but its link remains invalid. Queued retries recheck the latest token before sending, and do not extend token expiry.
- Provider acceptance is recorded as **ACCEPTED**, never “delivered.” Spam filtering, nonexistent mailboxes, recipient servers and later bounces can prevent inbox arrival. No provider guarantees inbox placement. Use Resend's dashboard to investigate deliveries and bounces; public webhook-based event monitoring can be added when an externally reachable endpoint exists.

## Security and operations

Only hashed tokens are stored in PasswordRecovery. The separately approved outbox holds the rendered email—including the link and recipient—encrypted at rest with a random nonce and authentication bound to its job ID. Content is erased after provider acceptance, permanent failure, cancellation or expiry. Retained metadata includes job kind/status, attempt count and fixed error codes; application logs do not include raw provider responses, addresses or links.

The worker sweeps expired payloads even during provider pauses. If sending is disabled, run `npm run email:worker -- --cleanup` to clear expired pending content without needing an API or encryption key. Cleanup must be scheduled independently if the worker is stopped. Database backups may retain older ciphertext; backup retention/key management must account for this.

Recovery links use the explicitly configured origin and a fragment (`/reset-password#token=...`) rather than query parameters. Fragments are not sent in HTTP requests. The future reset page must read/remove the fragment client-side, avoid third-party scripts and analytics around the credential, and submit it only in the reset POST body.

For production, use `resend-production`, a public HTTPS origin, a verified sending domain and a sending-restricted API key. Configure the required DNS verification records (SPF/DKIM), establish DMARC appropriately, and leave Resend click/open tracking disabled for these security messages. Do not use a `resend.dev` sender. Set `RECOVERY_TRUSTED_IP_HEADER=x-real-ip` or `cf-connecting-ip` only behind a proxy that strips client input and overwrites that header; prevent direct access bypassing the proxy. Use a supervised worker process and monitor its heartbeat, failed jobs, retry backlog, domain reputation and provider quotas.

## Verification

Run `npm test`, `npm run lint`, and a TypeScript check. For database/browser coverage, designate a **new** local `hustlen_test_*` database as documented in the Milestone 1 audit:

```sh
MRT_TEST_DATABASE_URL='postgresql://USER:PASSWORD@localhost:55433/hustlen_test_email_unique' npm run test:email
```

Optionally set `MRT_BROWSER_PATH=/usr/bin/chromium` if using the installed browser. The runner generates test-only encryption settings, disables real credentials, creates/removes its own database, and records `email-validation.json` plus redacted email previews/screenshots under `.test-artifacts/<run-id>/`. It covers template rendering, encryption, privacy, queue transactions, retries, competing workers, cancellation, notification failures and forward migration. Existing `test:recovery` and `test:integration` suites remain separate regressions.
