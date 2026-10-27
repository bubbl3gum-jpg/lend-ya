# Initial outcomes, kept separate from final verification

1. Initial TypeScript check found three test-only type errors: direct assignment of malformed scores/timestamps to the intentionally null-initialized template inferred narrow types. Negative tests now inject malformed values through `Object.assign` into the runtime validator, retaining strict production validation. No application or authorization change.
2. Initial unit launch in the restricted sandbox failed before tests: tsx local IPC socket `listen EPERM`. Reran the same suite with authorized local socket/process access. This was an environment launch failure, not a test pass. Final unit results recorded separately.

3. Generated Markdown initially had empty-conflict trailing whitespace and an extra final newline. The generator now labels absent conflict entries explicitly and writes one final newline; source/candidate hashes and scores are unchanged.

No deadlines, browser collectors, authentication/authorization, camera/GPS/QR, custody or other product assertions were loosened. Historical overlapping-workload login intermittence is still unresolved even if this batch's selected run passes. No live model was run and no human score inferred from tests.
