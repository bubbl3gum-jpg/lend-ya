# Private physical-device acceptance (prepared, not yet executed)

Use only a newly initialized, owned `hustlen_test_*` demo database. Never point
Prisma, demo commands, or the website at `p2p_marketplace`. Do not adopt a retained
database. Follow the existing demo ownership checks and teardown command.

## Private HTTPS setup

1. Use a dedicated test computer and trusted private Wi-Fi, with no router port
   forwarding, public tunnel, public DNS publishing, or deployment. Restrict the
   host firewall to the two test phones. If changing firewall settings requires
   approval, obtain it first. Do not disable the firewall.
2. Obtain an organization-approved certificate for a private hostname resolving
   only on that network to the test computer. Use an approved internal CA and
   certificate provisioning process; never commit CA/private keys. Install only
   the approved CA certificate on the two test phones. For a local CA, iOS may
   require explicit trust under Certificate Trust Settings. Android trust must be
   confirmed in Chrome. Never accept certificate warnings or disable browser TLS.
3. Put an approved HTTPS reverse proxy on that private interface, forwarding to
   Next on loopback. Preserve Host and Origin, forward the HTTPS scheme, and use
   the repository's configured same-origin/auth behavior. Set the application's
   origin settings to the exact private HTTPS origin where required. Keep body
   and access logs from recording QR/manual codes or request bodies. No caching
   authenticated pages/API. PostgreSQL remains private/loopback.
4. Set the two ordinary demo user IDs in `MEETUP_PREVIEW_USER_IDS`, provide a
   securely generated consistent `MEETUP_CODE_SECRET`, and explicitly choose
   `MEETUP_CONFIRMATION_TTL_SECONDS=900` **only for this proposed 15-minute pilot**.
   Public preview remains disabled unless those two IDs are configured. Review
   the proposal before wider use. QR redemption remains 180 seconds by default.
5. Confirm from both phones: valid HTTPS without warnings, `window.isSecureContext`
   true, login works, cookies are protected, hostile-origin requests still fail,
   and the app is inaccessible from outside the authorized private network.
   Stop if any condition fails. This guide does not authorize public exposure.

## Concrete local launch (operator-run, not executed on phones here)

Start from a clean checkout on this branch, with no retained demo state. Choose a
new `hustlen_test_*` URL in `MRT_TEST_DATABASE_URL` using actual local test credentials
and the configured PostgreSQL port (the earlier Mac setup used 55433, not 5432).
Do not copy literal placeholder usernames/passwords.
The owned demo initializer is the sole provisioning step; do not run manual
migrations against an arbitrary DATABASE_URL.

```sh
npx prisma generate --config prisma7.config.ts
npm run demo:chat -- init
npm run demo:chat -- info
```

Keep the synthetic credentials local. Obtain the two ordinary user IDs from info.
Set the following in that terminal using those IDs and a securely stored random
secret; do not paste secret values into tickets or commit them:

```sh
export DATABASE_URL="$MRT_TEST_DATABASE_URL"
export MEETUP_PREVIEW_USER_IDS='OWNER_ID,BORROWER_ID'
export MEETUP_CONFIRMATION_TTL_SECONDS=900
export CHAT_ENABLED=false
export CHAT_PREVIEW_USER_IDS=''
```

`OWNER_ID,BORROWER_ID` is a placeholder, not a working value. Set
`MEETUP_CODE_SECRET` securely to at least 32 random characters and retain it for
restart checks. Run production mode locally so session cookies have Secure set:

```sh
npm run build
npm run start -- --hostname 127.0.0.1 --port 3100
```

This is a local process, not a deployment. Do not use `demo:chat start` for phone
acceptance: its development mode does not set production Secure cookies.
Configure an already approved proxy (for example Caddy) with this template,
substituting only the private hostname, private interface address and approved
certificate paths. These are operator instructions, not permission to install
services or change firewall/certificate trust without approval.

```caddyfile
https://hustlen-demo.internal:8443 {
    bind PRIVATE_LAN_IP
    tls /private/path/demo-cert.pem /private/path/demo-key.pem
    reverse_proxy 127.0.0.1:3100
}
```

Do not enable access/request-body logging. Caddy preserves the request Host by
default; do not override it with localhost. Verify certificate hostname/SAN,
private resolution, Secure session cookies and cross-origin rejection before
exercising custody. The firewall must restrict 8443 to the two phones; no direct
LAN access to Next or PostgreSQL. This template has not been executed here and
requires the operator's approved proxy/certificate/network configuration.

After stopping the local production process and proxy, use the initializer's
recorded ownership for teardown:

```sh
npm run demo:chat -- down
```

## Two-device checklist

Record OS/browser versions, station/code/exit, time, outcome, and consent. Use
synthetic accounts and photos, not production conversations or personal evidence.

- iOS Safari and Android Chrome separately as Owner and Borrower, then swap roles.
- Register/login, create eligible listing, accept booking, Owner explicitly enrolls.
- GPS Allow, Deny, unavailable, inaccurate/underground, outside radius; one-shot
  permission only. Do not emulate coordinates in a real onsite acceptance claim.
- Document missing-coordinate stations; bilateral reduced assurance is explicit,
  and outside readings must not be accepted as unavailable.
- Owner evidence, pickup QR on one phone scanned by the rightful Borrower on the
  other; test rear camera, orientation, focus, low light and permission denial.
- Scan before the three-minute deadline; wait past it, then finish independent
  condition checklist/photos and physical receipt inside the saved confirmation
  window. Separately test an unused expired QR and an expired confirmation.
- Switch Wi-Fi/mobile data and interrupt the scan response; retry the same request.
  Lock/unlock the phone, background Safari/Chrome, refresh, and restart the local
  app with the same secret. Verify drafts and server proof, reselect photos as
  required; do not silently restore affirmative condition/receipt consent.
- Replace a challenge, change booking eligibility, open a dispute, use another
  participant, and attempt replay: each must fail closed without duplicate custody.
- Return reverses issuer/verifier. Owner physical receipt enters INSPECTION; a
  separate inspection is still mandatory. Scan alone never confirms custody.
- Verify QR scanning deadline and remaining confirmation time separately. A new
  GPS reading intentionally invalidates the old proof; do not recheck merely
  because the original location validity elapsed after a successful scan.
- Exercise Customer Service assistance; no emergency response/SLA implied.

Only claim onsite readiness after actual station/exit measurements and both
physical browsers pass. Client GPS is supporting evidence, not spoof prevention.
Default station radii require field calibration. Record false rejections and
fallback use without storing raw location in application logs.

## Teardown

Sign out, stop the app and proxy, run the owned demo teardown, remove test-only
phone certificate trust/profiles and private DNS entries as approved, remove
synthetic photos/session data, and check that no listener remains exposed. Never
reset/drop another database. Retention or deletion of actual user evidence needs
an approved policy; this guide handles only disposable synthetic fixtures.
