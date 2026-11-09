# Hustlen' account recovery — milestone 2 audit

## Implemented

- Resend adapter using the fixed HTTPS send endpoint, an eight-second timeout, safe error classification and stable idempotency keys. Provider acceptance is recorded as ACCEPTED, never as inbox delivery.
- Branded HTML/plain-text recovery and password-change messages: Hustlen' wordmark, white background, dark text, emerald action button, expiry/security guidance, and no template tracking resources.
- PostgreSQL outbox with AES-256-GCM encrypted content, atomic enqueue, persistent worker leases, bounded retries/backoff, provider Retry-After handling and ciphertext deletion on terminal outcomes. Account operations do not hold database locks while sending.
- Recovery request API returns the same neutral response for unknown accounts, accepted requests and throttles, with routine timing differences masked. Global configuration/worker/provider unavailability returns the same temporary error for all addresses.
- New recovery requests cancel older queued links. Successful resets cancel pending recovery messages and atomically queue notifications. Delivery failure after commit never undoes a password reset.
- Test-recipient restriction, trusted origin validation, safe localhost IP limiting and explicit proxy configuration for public deployments. No recovery tokens appear in HTTP URLs/query strings, API responses or application logs.
- Worker command, disabled-by-default environment example, setup/operations guide and isolated automated tests. Milestone 1 limits, hashing and session safeguards remain intact.

## Verification completed

All checks passed on November 9, 2026:

- TypeScript, ESLint, unit suites and whitespace checks.
- Email integration suite, including fresh/populated migrations, schema agreement, desktop/mobile Chromium previews, encrypted storage, retry/restart behavior, lost provider acknowledgement, competing workers, retry exhaustion/deadlines, private failures, cancellation and atomic notification persistence. Report: `.test-artifacts/678efe86ceb8c65de49878da/email-validation.json`.
- Milestone 1 recovery regression suite: `.test-artifacts/f6f6bbedbf95d471165e0297/recovery-validation.json`.
- Existing marketplace browser regression suite, with no browser errors: `.test-artifacts/46f0d15ff0f7cf4d578ee76f/validation.json`.

Automated provider responses were simulated; **zero real emails were sent**. All test databases were disposable and removed after their runs. The shared development database and existing accounts were not migrated or changed.

## Outstanding setup and limits

Live inbox verification requires a Resend account, its API key supplied securely, and that account's approved recipient address. Sending stays disabled until those settings are supplied. Managed-cloud sending also requires network access to `api.resend.com`, which is absent from the current environment allowlist. General recipient delivery requires a verified sending domain; Resend's default sender supports only the account email.

Localhost is valid for outbound-email testing. A localhost link must be opened on the machine/workspace hosting the app; use forwarding or staging for other devices. The dedicated reset page is milestone 3, so browser recovery is not complete yet. Registration email ownership verification is a separately approved future milestone.

No email service can guarantee inbox placement. Provider acceptance, recipient-server acceptance and inbox placement are different outcomes. Provider dashboard monitoring is available during local testing; webhook-based delivery-event monitoring remains a production follow-up requiring a public endpoint.

See [local setup, retry policy and production requirements](ACCOUNT_RECOVERY_EMAIL_SETUP.md) and [.env.example](../.env.example).
