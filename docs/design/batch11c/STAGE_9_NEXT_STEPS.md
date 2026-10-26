# Stage 9 next steps

Batch 11C is a scoped implemented candidate; Stage 9 remains In Progress.

1. Product owner reviews the provisional R1 appearance, 131-message Traditional Chinese catalogue/glossary, default English policy, persistence and exact coverage. Obtain Taiwan-native language and assistive-technology review.
2. Next small batch: audit and specify secure password change/recovery before implementation. Require current-session assurance, credential re-verification, rate limits, session revocation decisions, delivery-provider readiness, notifications and independent recovery policy. The existing forgot-password stub is not delivery.
3. Extend localization one approved vertical slice at a time (login/account activity first), preserving raw user content, server errors and operational contracts. Do not imply booking, Support or Admin are translated.
4. Investigate R1 overlapping-workload login timing separately; this batch’s serial readiness pass does not close that risk. Test physical phones, system fonts, screen readers and storage-disabled behavior.
5. Preserve Stage 6 station authorization blockers, Stage 7 Support policies/activation gates and Stage 8 production publication/settings approvals. No rollout follows from candidate test results.
