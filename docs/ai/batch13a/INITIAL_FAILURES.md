# Initial failures and corrections, separate from final outcomes

- First focused browser run: the test used text-content matching for a textarea. Corrected to checking its actual value without increasing the deadline.
- Second focused browser run: exact label selection still failed despite the visible field. The wrapping label contained the textarea's initial text; changed the real UI to a separate explicit `htmlFor`/`id` association. The value assertion was retained.
- Third focused browser run: new companion flows completed, but restoring the original workbench immediately before revoking its assignment raced the channel fetch. Added an explicit wait for the existing Owner message to be visible before the unchanged revocation assertion. No timeout/authorization/product requirement was relaxed. Final focused run passed all 15 tests.
- Normal production build: inherited remote Google Fonts fetch failed; proxy returned 403. This remains an environment blocker for an unconfigured build, not a source-code pass.
- First local-font binary response fixture: Turbopack failed rewriting/fetching absolute font resources. Replaced the **test-only** fixture with a disclosed CSS/system-fallback response via the framework's supported test hook. Isolated compilation and production route refusal then passed; no remote-font fidelity or default-build success claimed.
- Initial coordinator launch referenced a previous /tmp script which was unavailable in this execution environment. Recreated the coordinator locally; it uses the unchanged guarded harness and unique owned targets. No test or DB operation ran from the failed coordinator command.

Retained initial artifact run IDs and results are in initial-outcomes.json. No original schema/migration, browser-error collector, deadline, QR/camera/GPS/consent, custody or private data guard was weakened. No inference request, credential activation, billable operation or product-owner acceptance was manufactured.
