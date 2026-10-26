# Initial failures and corrections

All timestamps and machine records are UTC; user-facing report date is Asia/Taipei. Final results do not erase these attempts; see initial-outcomes.json.

- Initial TypeScript: conditional navigation label arrays widened to string; fixed typed literal keys. Final TypeScript succeeds.
- Initial bilingual browser run: deliberately blocked cookie access exposed an existing unguarded appearance-cookie write. Guarded optional persistence; in-memory language/appearance behavior remains available. No authentication cookie logic changed.
- Keyboard fixture: sent a native-select key before observing readiness/focus. Corrected to enabled + focused ArrowDown/Enter; retained actual Chinese-content assertion.
- Expiry fixture: induced expiration while the preceding successful-save refresh was still in progress. Real authentication correctly redirected, removing the form before the intended PATCH. Observe actual GET 200 and updated server-rendered account-menu name before inducing expiry.
- First refresh observation awaited response.finished() on an open development RSC stream. The unchanged 120-second test deadline fired; the process remained awaiting stream completion. Interrupted only exact-run-ID test/Chromium processes, then the owned harness cleaned the database. This attempt is cancelled/failed, never a pass. Replaced the stream-finish wait with bounded real response/UI observations, not a timeout increase.
- Final fresh bilingual browser run passed. A subsequent small feedback correction preserves the real expiry/sign-in guidance while editing the retained draft; final browser/account/build runs include it.

Expected negative scenarios use narrowly asserted local test deltas: actual account-save 500 from a temporary owned fixture trigger, actual expired-session 401, and one blocked development script in JavaScript-disabled rendering. Shared browser collection is unchanged; unexpected errors still fail. No broad HTTP/console suppression.

R1 overlapping-workload login deadline behavior is unresolved. This batch’s serial login-readiness run passed its original deadline; no causal fix is claimed.
