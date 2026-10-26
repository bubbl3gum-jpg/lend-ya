# Recommended next scope — Stage 9: Account Settings & User Experience

Master roadmap remains `docs/roadmap/MASTER_ROADMAP_14_STAGES.md`. Stage 8 is an implemented development candidate, not production ready. Keep publication/configuration approvals and Stage 6/7 blockers explicit while beginning separately authorized UX work.

Recommend a small read-model/design batch first: audit `app/account/page.tsx`, `components/account-settings.tsx`, profile pages, existing name/password endpoints, responsive marketplace/Admin shell and accessibility. Map genuine existing account data, loading/error/empty states, privacy and current session behavior. Preserve guards, private support conversations, custody obligations and MFA isolation.

Then propose a narrow, accessible visual improvement: consistent spacing/typography, mobile controls and approved light/dark themes using non-sensitive local preference or reviewed user preference storage. Specify contrast, keyboard/focus, reduced motion, form labels, loading/success/unsaved feedback and responsive screenshots. A theme preference must not enter the operational settings registry or alter security policy.

Language selection requires an explicit language/fallback/content-coverage proposal before implementation; no fabricated translated notices or AI localization. Existing password/account flows need server reauthentication, CSRF, rate-limit/session-revocation and suspended-user-obligation review before changes. Do not introduce recovery, identity reassociation, mandatory MFA or new staff controls as visual polish.

Gate the next batch with repository evidence, genuine existing account consumers, anonymous/foreign-user/expired/suspended denial where appropriate, no sensitive projections, desktop/tablet/mobile + keyboard/contrast review and relevant auth/rental/Support/Admin regressions in fresh owned DBs. No production rollout or completion of any master stage is implied. Obtain approval for the concrete Stage 9 slice before coding it.
