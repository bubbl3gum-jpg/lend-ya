# Initial failures and corrections

Final passes do not erase earlier attempts; machine metadata is in initial-outcomes.json.

1. New browser assertion used a global alert selector and matched both the real password error and Next’s route announcer. Scoped it to the password error ID; the expected message and five-second deadline remain.
2. Initial lint found a new test marker declared let instead of const. Corrected. Adding service-level Origin checks also initially omitted ORIGIN from the typed error union; TypeScript caught it, and the union was corrected. Neither was a runtime authorization-success claim.
3. Keyboard-copy acceptance exposed a genuine UI defect during the draft follow-through: the input was still disabled as well as read-only, and Save had not received the intended disabled condition. Corrected separately: name input stays enabled/read-only and keyboard-selectable, Save is disabled and submission guard returns; server denial remains authoritative. Fresh test verifies preserved value, focus and full-text selection after actual revocation.
4. The new expiry-during-lock-wait observer initially read a transaction-cached pg_stat_activity snapshot and saw no wait. Refresh pg_stat_clear_snapshot in each observation; keep the original five-second assertion and actual database expiry. An automated patch initially failed to match the formatted test, so a subsequent launched process still used the old observer; that repeat is retained as failed, not counted as an independent product defect. The corrected fresh process observes the real wait, allows actual time to pass and confirms 401 after release. No mock clock, authentication bypass or deadline increase.

The final password run includes real new-password browser login (including unchanged leading/trailing spaces), both-language success/error states, expired mounted form, duplicate-submit guard, 44px control checks and keyboard-copyable name draft. Earlier screenshots were replaced by final-source captures. Production, populated migration, selected regressions and static final results are recorded separately.

The R1 overlapping-workload login timing risk remains open. Quiet passing readiness and a separate successful password browser journey are not root-cause closure.
