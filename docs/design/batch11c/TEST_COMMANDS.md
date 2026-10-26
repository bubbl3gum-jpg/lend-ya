# Verification commands and scope

Executed in the existing isolated harness with newly owned `hustlen_test_11c_*` databases, effective-target verification, fresh migrations and cleanup. No existing application database was reset, migrated, seeded or edited. The temporary failure trigger was created/dropped only in the bilingual fixture database. Local test connection material was never committed.

For each of the 25 exact script names in regression-ledger.json, ran `npm run <group>`. All final child exit codes are 0 and cleanup records true. Wrapper exit status alone was not used to claim success. npm run test:unit: 94 passed; npx tsc --noEmit, npm run lint and npx prisma validate: exit 0. The build is the real production build via npm run build:verify.

This is a selected regression pass, not every package.json script. No new migration was needed; fresh schema replay is exercised by each isolated harness. Historical migration bytes/schema/lockfile and application API guards are unchanged. Populated upgrade suites were not separately rerun for this UI-only batch; no new migration-preservation claim is inferred from that omission.

Full npm run test:meetup: 11/11 with actual virtual-camera pickup and return decoding; see camera-pickup.json and camera-return.json (decoded, verify request 200, verifiedBooking true). Original npm run test:integration and test:meetup-session passed. No QR/GPS/camera/consent/custody assertion or shared error collector changed.

Login readiness ran serially after other browser groups completed, using the original deadline. The existing R1 overlap timing issue remains unresolved; do not interpret this isolated pass as a concurrency fix. Account forms, login/server transitions and language changes were exercised through actual application routes. Real 500/401 scenarios and initial cancelled/failed attempts are documented separately, not erased by reruns.

Browser evidence covers keyboard locale selection, SSR/no-JavaScript Chinese, immediate language changes, draft preservation, real saves and retry, expiry privacy, invalid locale fallback, storage/cookie rejection, cross-account selector isolation, raw escaped UGC, unchanged USD and independent appearance/sound/effects. Real phone, screen-reader, native-speaker acceptance and production rollout remain pending.
