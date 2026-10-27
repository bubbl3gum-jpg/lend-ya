# Final selected verification

Tested implementation `cf67562c6df99ea486aa354f24db5ea52305d34d`. **23/23 final selected isolated command groups passed**, plus **103/103 unit tests**, TypeScript, ESLint and Prisma validation (all exit 0). Initial failures are separate, not erased by final passes. Child exits and ended ownership/cleanup markers were inspected, not just coordinator status.

| Command (`npm run …`) | Final result | Node tests, when emitted |
| --- | --- | --- |
| `test:ai-case-brief` | PASS / exit 0 | 1 |
| `test:ai-case-brief-production` | PASS / exit 0 | 1 |
| `test:ai-case-brief-disabled` | PASS / exit 0 | 1 |
| `test:admin` | PASS / exit 0 | 7 |
| `test:workbench` | PASS / exit 0 | 7 |
| `test:case-history` | PASS / exit 0 | 8 |
| `test:support-channels` | PASS / exit 0 | 9 |
| `test:support-staff` | PASS / exit 0 | 14 |
| `test:authorization` | PASS / exit 0 | 8 |
| `test:staff-session` | PASS / exit 0 | 13 |
| `test:mfa` | PASS / exit 0 | 16 |
| `test:account-security-ux` | PASS / exit 0 | 1 |
| `test:localization` | PASS / exit 0 | 1 |
| `test:homepage` | PASS / exit 0 | 1 |
| `test:chat` | PASS / exit 0 | 14 |
| `test:moderation` | PASS / exit 0 | 10 |
| `test:integration` | PASS / exit 0 | not emitted |
| `test:meetup-session` | PASS / exit 0 | 6 |
| `test:meetup` | PASS / exit 0 | 11 |
| `test:rental-api` | PASS / exit 0 | 13 |
| `test:login-readiness` | PASS / exit 0 | 1 |
| `test:password-change` | PASS / exit 0 | 1 |
| `build:verify` | PASS / exit 0 | not emitted |

Actual prototype browser checks: ACTIVE legacy Admin only; anonymous/ordinary/suspended/expired denial; forged selectors refused; no AI mutation endpoint; source correspondence/keyboard citations; scripted/uncertainty labels; local review/edit/reset/discard and retained language; actual mobile touch review; escaped injection; no cross-case display references; no external HTTP/API-data/mutation requests in the positive browser context; selected case-state hashes unchanged. Production build/start with flag configured and disabled development both return 404 with link absent. No provider/model was called. All fixtures intentionally ship together; this is not live per-case privacy enforcement or a model-quality test.

Full meetup **11/11** includes genuine virtual-camera pickup/return QR decoding, verification 200 and track cleanup, retained in camera JSONs. Original MRT integration and meetup-session **6/6** passed. Login readiness ran once alongside bounded unrelated selected-suite work with its original deadlines; its pass does not root-cause or close historical R1 intermittence. Source privacy/authorization, account/password, MFA/staff, rental and Admin behavior are preserved. No global browser-error suppression, assertion deadline relaxation or GPS/consent/evidence/custody change.

Each data-changing command used a separate fresh owned disposable database. Parallel command chains and exact UTC times are visible in regression-ledger.json; no performance/production benchmark is inferred from this development workload. Final read-only maintenance reports **zero owned 12A DBs and zero marked test principals**. Existing schema/migrations/lockfile/auth/Support/chat/provider/staff/custody source remains unchanged (source-preservation.json). Replayed existing migrations only on new owned targets; no migration or existing database change was required for this static prototype.

See INITIAL_FAILURES.md and initial-outcomes/ for mode mismatch, streaming-selector status defect and production type-check failure, plus the rejected unsafe proposed runner binding and safer correction. Physical Safari/iPhone, screen readers, native zoom, full contrast review and low-end-device acceptance are not certified. Visual approval, Stage 6–9 blockers and actual AI/provider/export policies remain pending. No merge/push/deploy or live staff/Support/AI activation.
