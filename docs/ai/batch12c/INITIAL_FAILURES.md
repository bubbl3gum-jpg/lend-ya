# Initial failures and corrections

The first new unit run failed one architecture-sentinel test: its forbidden-import regex found the word `dotenv` in a comment explicitly saying the script had no environment loader. Corrected only that comment. The guard was not weakened and no loader/provider/network behavior changed. The initial summary is retained in initial-unit-summary.json; final unit run passes 115/115.

Review also tightened dry-run budget validation to require exact fields (missing/extra limits cannot become unlimited), pinned the proposed corpus digest, and made novel-number hints inspect the **cited** sources rather than all case sources. A same-case wrong-date citation now triggers a review hint. These are offline preparation corrections, not proof of semantic accuracy or actual billable-cost enforcement.

Completed browser coverage was extended to capture Chinese approval/hint disclosures and verify native keyboard/touch behavior. The final browser/build run includes the returned-result hint refinement; later additions are evidence assertions only. No general browser-error suppression, authentication change, deadline relaxation, synthetic-camera weakening or provider activation occurred.

Current command ledger preserves actual final child outcomes separately from initial failure. Historical R1 login timing intermittence remains unresolved; the selected readiness pass does not close it. No third-party security/visual/device or real-model quality certification is claimed.
