# Bounded login timing investigation

Historical R1 failure is retained in `docs/design/batch11a-r1/login-timing.json`: an unchanged five-second not-/login assertion failed with dashboard document navigation pending during overlapping account/heritage work. Its server had returned login 200 in 1890ms (1761ms compilation / 122ms application) and dashboard 200 in 254ms (57ms compilation / 197ms application). A later quiet rerun passed; neither observation establishes cause. Batch 11B quiet follow-up is not evidence of overlap closure.

## Two planned overlap trials

A and B used separate fresh owned databases per command, real register/login, actual browser navigation and original five-second assertions. Only each trial's named workload ran concurrently during these controlled windows. No anonymous dashboard warming or fabricated authentication response was used.

| Trial | Browser workload | Original login-readiness | Additional cold/warm diagnostic |
| --- | --- | --- | --- |
| A | account-design 03:51:12–30Z, heritage-ui 03:51:30–58Z | 03:51:24–47Z; delayed hydration + six repeats passed | 03:51:47–03:52:06Z; three fresh contexts passed |
| B | heritage-ui 03:54:34–59Z, account-security-ux 03:54:59–03:55:23Z | 03:54:46–03:55:11Z; delayed hydration + six repeats passed | 03:55:11–30Z; three fresh contexts passed |

Exact start/end, run IDs, outcomes and bounded diagnostics are in `login-timing/overlap-a/` and `overlap-b/`. They capture method/path/status, hydration marker, document navigation/frame events, cookie-presence/HttpOnly booleans, database counts and host load. No cookie/token values, credential payloads or private booking/location data are retained. The new `tests/login-contention.integration.test.ts` checks a real hydrated form and strict browser errors; the original readiness/navigation suites remain unchanged.

Cold diagnostic observation took about 2525ms (A) / 2475ms (B) after click, versus 234–380ms / 267–286ms on warm paths. These values include diagnostic collection and are **not pure server processing or exact assertion completion**. Per-attempt timelines separate POST, response and dashboard document/frame commit; compilation is separated in retained server timing lines. Development cold/hydration overhead is visible; an authentication correctness defect was not demonstrated. B's initial /login page hydration/fill took 3444ms before click and is distinct from the five-second post-submit assertion.

The first diagnostic metadata stored an empty serverTimingLines array because Next's lines were indented. Raw browser evidence is preserved; exact allowlisted server lines were extracted afterward into separate `*-server-timings.json`, and the parser now trims indentation. No extra quiet rerun was used to manufacture closure. The original five-second assertion, protected API behavior and shared error collector were not relaxed.

**Conclusion: historical failure not reproduced; root cause unresolved.** These bounded overlap passes reduce uncertainty but cannot close intermittence. Retain the engineering tracker: reproduce on a recorded failing workload, compare hydration/compile/document-navigation and host pressure, and preserve the initial failure before changing code. No authentication/timing workaround was justified or added.
